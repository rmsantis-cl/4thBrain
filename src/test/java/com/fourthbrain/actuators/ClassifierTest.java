package com.fourthbrain.actuators;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fourthbrain.llm.OllamaClient;
import com.fourthbrain.llm.OllamaException;
import com.fourthbrain.persistence.DatabaseService;
import com.fourthbrain.persistence.entity.Document;
import com.fourthbrain.persistence.entity.DocumentTag;
import com.fourthbrain.persistence.entity.Tag;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Story P2.4 (ADR31) — what the Classifier does with a reply, good or bad.
 *
 * No Spring context and no Mockito: a real Classifier, a hand-written OllamaClient and
 * a DatabaseService subclass holding its rows in maps. Nothing here touches
 * data/fourthbrain.db, opens a port, or calls a model, so it runs in milliseconds
 * beside whatever else is on the machine.
 *
 * The through-line of every case is ADR31 decision 4: whatever goes wrong, a failed
 * classification must not strand the document. The Indexer publishes before this stage
 * runs (BUG-005), so the Classifier is terminal and every path returns null — the
 * document is already in the vault whatever happens here.
 */
@DisplayName("Classifier behaviour (real objects, log-verified)")
class ClassifierTest {

    private static final String GOOD_REPLY =
            "Sure:\n```json\n{\"topic\": \"Spring Boot\", \"tags\": [\"Java\", \"#Spring Boot\"]}\n```";

    private Classifier classifier;
    private FakeOllamaClient ollama;
    private FakeDatabase database;
    private Logger classifierLog;
    private ListAppender<ILoggingEvent> logCapture;

    @BeforeEach
    void setUp() {
        classifier = new Classifier();
        classifier.assignName("Classifier-test");

        ollama = new FakeOllamaClient();
        database = new FakeDatabase();
        classifier.ollamaClient = ollama;
        classifier.databaseService = database;

        classifierLog = (Logger) LoggerFactory.getLogger(Classifier.class);
        logCapture = new ListAppender<>();
        logCapture.start();
        classifierLog.addAppender(logCapture);
    }

    @AfterEach
    void tearDown() {
        classifierLog.detachAppender(logCapture);
    }

    private static Document doc(String content) {
        return Document.builder()
                .id(7L)
                .name("note.md")
                .mimeType("text/markdown")
                .content(content)
                .status("classifying")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    private boolean loggedAtLevel(String levelName, String fragment) {
        return logCapture.list.stream().anyMatch(e ->
                e.getLevel().toString().equals(levelName) && e.getFormattedMessage().contains(fragment));
    }

    private String formattedMessages() {
        return logCapture.list.stream().map(ILoggingEvent::getFormattedMessage).reduce("", (a, b) -> a + " | " + b);
    }

    @Test
    @DisplayName("a good reply writes the topic, the tags and the links, and ends the chain")
    void goodReplyIsStored() {
        ollama.reply = GOOD_REPLY;
        Document doc = doc("A long enough note about building services with Spring Boot.");

        String next = classifier.doTheThing(doc);

        assertNull(next, "the Classifier is the last stage; nothing follows it");
        assertEquals("Spring Boot", database.topics.get(7L), "the row's topic");
        assertEquals(List.of("java", "spring-boot"), database.activeTagNames(7L),
                "tags are normalised before they are written (ADR31 decision 3)");
        assertTrue(database.tags.containsKey("java") && database.tags.containsKey("spring-boot"),
                "a tag row is created for each name; tag.name is the primary key");
    }

    @Test
    @DisplayName("the in-memory Document carries the topic, not only the row")
    void inMemoryDocumentGetsTheTopic() {
        ollama.reply = GOOD_REPLY;
        Document doc = doc("Something about Spring Boot.");

        classifier.doTheThing(doc);

        assertEquals("Spring Boot", doc.getTopic(),
                "the Document travels in the Message (ADR26 decision 2) and carries what was learned here");
    }

    @Test
    @DisplayName("a garbage reply writes nothing, warns, and ends the chain without stranding the document")
    void garbageReplyIsNotFatal() {
        ollama.reply = "I am afraid I cannot classify that document.";
        Document doc = doc("Some content that the model did not like.");

        String next = classifier.doTheThing(doc);

        assertNull(next, "a parse failure is not a pipeline failure (ADR31 decision 4); "
                + "the document was published by the Indexer before this stage ran");
        assertNull(doc.getTopic());
        assertTrue(database.topics.isEmpty());
        assertTrue(database.links.isEmpty());
        assertTrue(loggedAtLevel("WARN", "No JSON object in the model reply"),
                "expected a WARN naming the unparseable reply; captured:" + formattedMessages());
    }

    @Test
    @DisplayName("an OllamaException is logged at ERROR and ends the chain")
    void failedCallIsNotFatal() {
        ollama.failure = new OllamaException("connection refused", 502, "upstream", null);
        Document doc = doc("Content that never reaches a model.");

        String next = classifier.doTheThing(doc);

        assertNull(next);
        assertNull(doc.getTopic());
        assertTrue(database.links.isEmpty());
        assertTrue(loggedAtLevel("ERROR", "Model call failed"),
                "expected an ERROR naming the failed call; captured:" + formattedMessages());
    }

    @Test
    @DisplayName("a document with no content makes no model call at all")
    void blankContentSkipsTheModel() {
        ollama.reply = GOOD_REPLY;

        assertNull(classifier.doTheThing(doc("   \n\t  ")));
        assertNull(classifier.doTheThing(doc(null)));

        assertEquals(0, ollama.calls, "the one Ollama permit must not be spent on an empty string");
        assertTrue(database.links.isEmpty());
    }

    @Test
    @DisplayName("with no OllamaClient injected the document stays unclassified rather than failing")
    void noClientIsNotFatal() {
        classifier.ollamaClient = null;
        Document doc = doc("Content, but P2.1 has not merged yet.");

        assertNull(classifier.doTheThing(doc));
        assertTrue(loggedAtLevel("WARN", "No OllamaClient available"),
                "expected a WARN naming the missing client; captured:" + formattedMessages());
    }

    @Test
    @DisplayName("re-classifying retires the earlier generation of tag links")
    void reclassificationRetiresOldLinks() {
        ollama.reply = "{\"topic\": \"first\", \"tags\": [\"alpha\", \"beta\"]}";
        Document doc = doc("A note that gets classified twice.");
        classifier.doTheThing(doc);
        assertEquals(List.of("alpha", "beta"), database.activeTagNames(7L));

        ollama.reply = "{\"topic\": \"second\", \"tags\": [\"gamma\"]}";
        classifier.doTheThing(doc);

        assertEquals(List.of("gamma"), database.activeTagNames(7L),
                "only the newest generation of links stays active");
        assertEquals(3, database.links.size(), "the earlier rows are end-dated, not deleted");
        assertEquals("second", doc.getTopic());
    }

    @Test
    @DisplayName("a null document stops the chain rather than routing on")
    void nullDocumentStops() {
        assertNull(classifier.doTheThing(null));
        assertEquals(0, ollama.calls);
    }

    @Test
    @DisplayName("the prompt names the document and marks a truncation")
    void promptCarriesNameTypeAndTruncation() {
        ollama.reply = GOOD_REPLY;
        classifier.maxChars = 40;
        Document doc = doc("word ".repeat(50));

        classifier.doTheThing(doc);

        assertEquals(1, ollama.calls);
        assertTrue(ollama.lastUserPrompt.contains("Name: note.md"));
        assertTrue(ollama.lastUserPrompt.contains("Type: text/markdown"));
        assertTrue(ollama.lastUserPrompt.contains("…[truncated]"),
                "a model given a sentence cut mid-word sometimes classifies the truncation");
        assertEquals(Classifier.DEFAULT_SYSTEM_PROMPT, ollama.lastSystemPrompt,
                "an unset classifier.system-prompt falls back to the constant, not to null");
    }

    // ---- fakes ----

    /** Hand-written rather than mocked: three fields say everything these tests ask about. */
    private static final class FakeOllamaClient implements OllamaClient {
        private String reply = "";
        private RuntimeException failure;
        private int calls;
        private String lastSystemPrompt;
        private String lastUserPrompt;

        @Override
        public String chat(String systemPrompt, String userPrompt) {
            calls++;
            lastSystemPrompt = systemPrompt;
            lastUserPrompt = userPrompt;
            if (failure != null) {
                throw failure;
            }
            return reply;
        }

        @Override
        public boolean isAvailable() {
            return failure == null;
        }
    }

    /**
     * DatabaseService with its rows in maps. Subclassed rather than mocked so the
     * check-then-create and retire-then-link sequences run for real; the repositories
     * are never touched, which is why null is a safe argument to the constructor.
     */
    private static final class FakeDatabase extends DatabaseService {

        private final Map<Long, String> topics = new HashMap<>();
        private final Map<String, Tag> tags = new LinkedHashMap<>();
        private final List<DocumentTag> links = new ArrayList<>();
        private long nextLinkId = 1;

        private FakeDatabase() {
            super(null, null, null, null);
        }

        private List<String> activeTagNames(Long documentId) {
            return getActiveTagsByDocumentId(documentId).stream().map(DocumentTag::getTagName).toList();
        }

        @Override
        public Document updateDocumentTopic(Long documentId, String topic) {
            topics.put(documentId, topic);
            return null;
        }

        @Override
        public Tag getTag(String tagName) {
            return tags.get(tagName);
        }

        @Override
        public Tag createTag(String tagName) {
            Tag tag = new Tag(tagName);
            tags.put(tagName, tag);
            return tag;
        }

        @Override
        public DocumentTag linkDocumentToTag(Long documentId, String tagName) {
            DocumentTag link = new DocumentTag(documentId, tagName);
            link.setId(nextLinkId++);
            links.add(link);
            return link;
        }

        @Override
        public DocumentTag endDateDocumentTag(Long documentTagId) {
            for (DocumentTag link : links) {
                if (link.getId().equals(documentTagId)) {
                    link.setEndDate(LocalDateTime.now());
                    return link;
                }
            }
            return null;
        }

        @Override
        public List<DocumentTag> getActiveTagsByDocumentId(Long documentId) {
            return links.stream()
                    .filter(l -> l.isActive() && l.getDocumentId().equals(documentId))
                    .toList();
        }
    }
}
