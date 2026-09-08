package com.fourthbrain.actuators;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fourthbrain.llm.OllamaClient;
import com.fourthbrain.llm.OllamaException;
import com.fourthbrain.messaging.Message;
import com.fourthbrain.persistence.DatabaseService;
import com.fourthbrain.persistence.entity.DocumentTag;
import com.fourthbrain.persistence.entity.Document;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

/**
 * Asks the local model what a document is about and records the answer (Story P2.4, ADR31).
 *
 * The contract is ADR31's: the model answers with a JSON object carrying a topic and a
 * tag array; the result is stored as document.topic plus document_tag rows, with no
 * classification table; and nothing here stops the chain. A blank document, an absent
 * client, a failed call and an unparseable reply all route on to the Indexer, because a
 * document without labels is worth more than a document that never reaches the vault.
 */
@Slf4j
public class Classifier extends Actuator {

    private static final BlockingQueue<Message> classifierQueue = new LinkedBlockingQueue<>();

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /** document.topic is VARCHAR(256); SQLite would not complain, the UI would. */
    private static final int TOPIC_MAX_CHARS = 256;

    static final int DEFAULT_MAX_TAGS = 8;
    static final int DEFAULT_MAX_TAG_LENGTH = 64;

    /**
     * Used when classifier.system-prompt is unset. Kept as a constant rather than a
     * @Value default because the schema it quotes contains ':' and '}', which the
     * property placeholder parser reads as its own syntax.
     */
    static final String DEFAULT_SYSTEM_PROMPT = """
            You classify documents for a personal knowledge vault.
            Answer with a single JSON object and nothing else:
            {"topic": "<one short noun phrase>", "tags": ["<lowercase-hyphenated>", ...]}
            Use at most 8 tags. Do not explain. Do not use code fences.""";

    // Package-private, not private: Spring injects either way, and the tests in this
    // package set them directly rather than standing up a context for four fields.

    /**
     * Optional on purpose (ADR31, consequences). P2.1 owns com.fourthbrain.llm and merges
     * separately; on a tree carrying the interface but no implementation bean, a required
     * injection fails the whole application context.
     */
    @Autowired(required = false)
    OllamaClient ollamaClient;

    @Autowired
    DatabaseService databaseService;

    @Value("${classifier.max-chars:8000}")
    int maxChars = 8000;

    @Value("${classifier.max-tags:8}")
    int maxTags = DEFAULT_MAX_TAGS;

    @Value("${classifier.max-tag-length:64}")
    int maxTagLength = DEFAULT_MAX_TAG_LENGTH;

    @Value("${classifier.system-prompt:}")
    String systemPrompt;

    public Classifier() {
        super();
        log.info("Classifier initialized");
    }

    @Override
    protected BlockingQueue<Message> getQueue() {
        return classifierQueue;
    }

    @Override
    public String getGerund() {
        return "classifying";
    }

    @Override
    public String getParticiple() {
        return "classified";
    }

    @Override
    public String doTheThing(Document doc) {
        if (doc == null) {
            log.warn("Received null document");
            return null;
        }

        log.info("Classifying document: id={}, name={}", doc.getId(), doc.getName());

        String content = truncate(doc.getContent(), maxChars);
        if (content.isBlank()) {
            // Never spend the single Ollama permit on an empty string: the Briefing
            // and every other document queue behind it.
            log.info("Nothing to classify, document has no content: id={}", doc.getId());
            return "Indexer";
        }

        if (ollamaClient == null) {
            log.warn("No OllamaClient available; document goes on unclassified: id={}", doc.getId());
            return "Indexer";
        }

        String reply;
        long startedAt = System.currentTimeMillis();
        try {
            reply = ollamaClient.chat(effectiveSystemPrompt(), userPrompt(doc, content));
        } catch (InterruptedException e) {
            // Shutdown, not a processing failure. Restore the flag so Actuator.run()'s
            // next take() throws immediately and breaks the loop; doTheThing() cannot
            // declare a checked exception without changing the frozen Actuator.
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while waiting for the model", e);
        } catch (OllamaException e) {
            log.error("Model call failed; document goes on unclassified: id={}", doc.getId(), e);
            return "Indexer";
        }
        log.info("Model answered in {} ms: id={}", System.currentTimeMillis() - startedAt, doc.getId());
        log.debug("Raw model reply: id={}, reply={}", doc.getId(), reply);

        Classification classification = parse(reply, maxTags, maxTagLength);
        if (classification == null) {
            log.warn("No JSON object in the model reply; document goes on unclassified: id={}, reply={}",
                    doc.getId(), reply);
            return "Indexer";
        }

        try {
            persist(doc, classification);
        } catch (Exception e) {
            log.error("Could not store the classification; document goes on: id={}", doc.getId(), e);
        }

        return "Indexer";
    }

    // ---- prompts ----

    String effectiveSystemPrompt() {
        return (systemPrompt == null || systemPrompt.isBlank()) ? DEFAULT_SYSTEM_PROMPT : systemPrompt;
    }

    static String userPrompt(Document doc, String content) {
        StringBuilder prompt = new StringBuilder();
        if (doc.getName() != null && !doc.getName().isBlank()) {
            prompt.append("Name: ").append(doc.getName()).append('\n');
        }
        if (doc.getMimeType() != null && !doc.getMimeType().isBlank()) {
            prompt.append("Type: ").append(doc.getMimeType()).append('\n');
        }
        return prompt.append("\nContent:\n").append(content).toString();
    }

    /**
     * Cuts content to maxChars on a whitespace boundary and says so. The marker is not
     * decoration: a model handed a sentence cut mid-word will sometimes classify the
     * truncation instead of the document.
     */
    static String truncate(String content, int maxChars) {
        if (content == null) {
            return "";
        }
        String stripped = content.strip();
        if (maxChars <= 0 || stripped.length() <= maxChars) {
            return stripped;
        }
        String head = stripped.substring(0, maxChars);
        int lastBreak = -1;
        for (int i = head.length() - 1; i >= 0; i--) {
            if (Character.isWhitespace(head.charAt(i))) {
                lastBreak = i;
                break;
            }
        }
        // Only honour the boundary when it is not far back: one enormous unbroken token
        // would otherwise truncate the document to nothing.
        if (lastBreak > maxChars / 2) {
            head = head.substring(0, lastBreak);
        }
        return head.strip() + "\n…[truncated]";
    }

    // ---- parsing (ADR31 decision 3) ----

    /** What the model said, after normalisation. Either field may be null or empty. */
    record Classification(String topic, List<String> tags) {
    }

    static Classification parse(String reply) {
        return parse(reply, DEFAULT_MAX_TAGS, DEFAULT_MAX_TAG_LENGTH);
    }

    static Classification parse(String reply, int maxTags, int maxTagLength) {
        String json = extractJsonObject(reply);
        if (json == null) {
            return null;
        }
        try {
            JsonNode root = MAPPER.readTree(json);
            if (!root.isObject()) {
                return null;
            }
            List<String> raw = new ArrayList<>();
            JsonNode tags = root.path("tags");
            if (tags.isArray()) {
                tags.forEach(t -> raw.add(t.asText()));
            } else if (tags.isTextual()) {
                // A model that answers "tags": "a, b" rather than an array. Cheap to accept.
                for (String piece : tags.asText().split(",")) {
                    raw.add(piece);
                }
            }
            return new Classification(
                    normaliseTopic(root.path("topic").asText(null)),
                    normalise(raw, maxTags, maxTagLength));
        } catch (Exception e) {
            log.debug("Reply held a brace-balanced span that is not JSON: {}", json, e);
            return null;
        }
    }

    /**
     * The first balanced {...} in the reply, or null when there is none.
     *
     * Brace depth tracked character by character, with braces inside string literals
     * ignored and their escapes honoured. A regex gets this wrong in a way that hides:
     * the lazy form stops at the first '}', which for a value containing a brace yields
     * a prefix that is still valid JSON with the tags missing (ADR31 decision 3).
     */
    static String extractJsonObject(String reply) {
        if (reply == null) {
            return null;
        }
        int start = reply.indexOf('{');
        if (start < 0) {
            return null;
        }
        int depth = 0;
        boolean inString = false;
        boolean escaped = false;
        for (int i = start; i < reply.length(); i++) {
            char c = reply.charAt(i);
            if (inString) {
                if (escaped) {
                    escaped = false;
                } else if (c == '\\') {
                    escaped = true;
                } else if (c == '"') {
                    inString = false;
                }
                continue;
            }
            if (c == '"') {
                inString = true;
            } else if (c == '{') {
                depth++;
            } else if (c == '}' && --depth == 0) {
                return reply.substring(start, i + 1);
            }
        }
        return null;   // opened and never closed
    }

    static String normaliseTopic(String topic) {
        if (topic == null) {
            return null;
        }
        String collapsed = topic.strip().replaceAll("\\s+", " ");
        if (collapsed.isEmpty()) {
            return null;
        }
        return collapsed.length() <= TOPIC_MAX_CHARS ? collapsed : collapsed.substring(0, TOPIC_MAX_CHARS);
    }

    static List<String> normalise(List<String> raw) {
        return normalise(raw, DEFAULT_MAX_TAGS, DEFAULT_MAX_TAG_LENGTH);
    }

    /**
     * tag.name is the primary key, so two spellings of one idea are two tags forever.
     * This is what keeps the shared namespace from filling up with near-duplicates.
     */
    static List<String> normalise(List<String> raw, int maxTags, int maxTagLength) {
        LinkedHashSet<String> out = new LinkedHashSet<>();
        if (raw == null) {
            return List.of();
        }
        for (String candidate : raw) {
            if (candidate == null) {
                continue;
            }
            String tag = candidate.strip();
            while (tag.startsWith("#")) {
                tag = tag.substring(1);
            }
            tag = tag.toLowerCase()
                    .replaceAll("[\\s_]+", "-")
                    .replaceAll("[^a-z0-9-]", "")
                    .replaceAll("-{2,}", "-")
                    .replaceAll("^-+|-+$", "");
            if (tag.isEmpty() || tag.length() > maxTagLength) {
                continue;
            }
            out.add(tag);
            if (out.size() >= maxTags) {
                break;
            }
        }
        return List.copyOf(out);
    }

    // ---- persistence (ADR31 decision 2) ----

    private void persist(Document doc, Classification classification) {
        Long docId = doc.getId();
        String topic = classification.topic();

        if (topic != null && !topic.isBlank()) {
            if (docId != null) {
                databaseService.updateDocumentTopic(docId, topic);
            }
            // The in-memory Document travels in the Message (ADR26 decision 2) and the
            // Indexer reads it next. Writing only the row is the mistake DD-1 describes.
            doc.setTopic(topic);
        }

        if (docId == null) {
            log.warn("Document has no id; topic set in memory only, no tags written");
            return;
        }

        retireExistingTags(docId);

        for (String tag : classification.tags()) {
            ensureTagExists(tag);
            databaseService.linkDocumentToTag(docId, tag);
        }
        log.info("Classified doc={} topic='{}' tags={}", docId, topic, classification.tags());
    }

    /** Re-classifying must not leave two generations of tags active. */
    private void retireExistingTags(Long docId) {
        List<DocumentTag> active = databaseService.getActiveTagsByDocumentId(docId);
        if (active == null || active.isEmpty()) {
            return;
        }
        for (DocumentTag link : active) {
            databaseService.endDateDocumentTag(link.getId());
        }
        log.debug("Retired {} earlier tag link(s) on doc={}", active.size(), docId);
    }

    /**
     * Check-then-create straddles two synchronized DatabaseService calls, so two
     * Classifier threads can both find a tag absent and both try to create it. With
     * classifier: 1 this never fires; the thread count is a config value, so the catch
     * is here rather than a lock.
     */
    private void ensureTagExists(String tag) {
        if (databaseService.getTag(tag) != null) {
            return;
        }
        try {
            databaseService.createTag(tag);
        } catch (DataIntegrityViolationException e) {
            log.debug("Tag '{}' was created concurrently", tag);
        }
    }
}
