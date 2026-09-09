package com.fourthbrain.llm;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The one path to the local model (P2.1).
 *
 * {@code ollama.url} already ends in {@code /v1}, so the path appended here is
 * {@code /chat/completions} and nothing else. Appending {@code /v1/chat/completions} yields a
 * 404 that reads like the service being down.
 *
 * The model is not configured. Per ADR35 (Story P2.12) it is whichever model Ollama currently has
 * loaded, read from {@code /api/ps} before each call. {@code /api/ps} is on the native API rather
 * than the OpenAI-compatible surface, so its root is derived by stripping the {@code /v1} suffix.
 * A call made while nothing is loaded fails rather than naming a model and letting Ollama load it
 * implicitly.
 */
@Component
@Slf4j
public class OllamaHttpClient implements OllamaClient {

    private static final int SNIPPET_CHARS = 200;
    private static final String V1_SUFFIX = "/v1";
    private static final String PS_PATH = "/api/ps";

    private final RestTemplate restTemplate;
    private final RestTemplate probeTemplate;
    private final ConcurrencyGate gate;
    private final String baseUrl;
    private final String nativeUrl;
    private final ObjectMapper mapper = new ObjectMapper();

    public OllamaHttpClient(RestTemplateBuilder builder,
                            ConcurrencyGate gate,
                            @Value("${ollama.url:http://localhost:11434/v1}") String url,
                            @Value("${ollama.connect-timeout-ms:5000}") long connectTimeoutMs,
                            @Value("${ollama.read-timeout-ms:120000}") long readTimeoutMs) {
        // Built here rather than declared as a @Bean: a shared RestTemplate is something
        // another component could later reconfigure out from under this client.
        this.restTemplate = builder
                .connectTimeout(Duration.ofMillis(connectTimeoutMs))
                .readTimeout(Duration.ofMillis(readTimeoutMs))
                .build();
        // Also carries the /api/ps lookup: a status call answers in milliseconds, so the
        // generation read timeout would be the wrong bound for it.
        this.probeTemplate = builder
                .connectTimeout(Duration.ofMillis(connectTimeoutMs))
                .readTimeout(Duration.ofMillis(connectTimeoutMs))
                .build();
        this.gate = gate;
        this.baseUrl = stripTrailingSlash(url);
        this.nativeUrl = stripV1Suffix(this.baseUrl);
    }

    @Override
    public String chat(String systemPrompt, String userPrompt) throws InterruptedException {
        if (userPrompt == null) {
            throw new OllamaException("userPrompt must not be null");
        }
        // Every HTTP call goes through the gate; the gate is the only thing serialising them.
        return gate.call(() -> send(systemPrompt, userPrompt));
    }

    /**
     * Available means a model is loaded, not that the port answers. Probing the model list instead
     * would return true in exactly the situation where every chat call fails (ADR35 decision 5).
     */
    @Override
    public boolean isAvailable() {
        try {
            resolveLoadedModel();
            return true;
        } catch (OllamaException e) {
            log.debug("No usable Ollama model: {}", e.getMessage());
            return false;
        }
    }

    private String send(String systemPrompt, String userPrompt) {
        // Resolved first: a call with nothing loaded must not reach /chat/completions.
        String model = resolveLoadedModel();
        String uri = baseUrl + "/chat/completions";

        List<Map<String, String>> messages = new ArrayList<>();
        if (systemPrompt != null && !systemPrompt.isBlank()) {
            messages.add(Map.of("role", "system", "content", systemPrompt));
        }
        messages.add(Map.of("role", "user", "content", userPrompt));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("messages", messages);
        body.put("stream", false);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        long started = System.currentTimeMillis();
        try {
            ResponseEntity<String> response =
                    restTemplate.postForEntity(uri, new HttpEntity<>(body, headers), String.class);
            String content = extractContent(response.getBody());
            long elapsedMs = System.currentTimeMillis() - started;
            log.info("Ollama chat model={} promptChars={} elapsedMs={}",
                    model, userPrompt.length(), elapsedMs);
            log.debug("Ollama reply: {}", content);
            return content;
        } catch (RestClientResponseException e) {
            int status = e.getStatusCode().value();
            String snippet = truncate(e.getResponseBodyAsString());
            log.error("Ollama returned HTTP {} from {}: {}", status, uri, snippet);
            throw new OllamaException("Ollama returned HTTP " + status + " from " + uri,
                    status, snippet, e);
        } catch (ResourceAccessException e) {
            log.error("Ollama unreachable at {}: {}", uri, e.getMessage());
            throw new OllamaException("Ollama unreachable at " + uri, e);
        }
    }

    /**
     * The name Ollama reports for the model it currently holds resident (ADR35 decisions 1, 3, 4).
     * More than one loaded is not an error — someone comparing models will have two loaded at some
     * point, and failing every call until they stop one is a worse default than picking one and
     * saying so in the log.
     */
    private String resolveLoadedModel() {
        String uri = nativeUrl + PS_PATH;
        String body;
        try {
            body = probeTemplate.getForObject(uri, String.class);
        } catch (RestClientResponseException e) {
            int status = e.getStatusCode().value();
            String snippet = truncate(e.getResponseBodyAsString());
            log.error("Ollama returned HTTP {} from {}: {}", status, uri, snippet);
            throw new OllamaException("Ollama returned HTTP " + status + " from " + uri,
                    status, snippet, e);
        } catch (ResourceAccessException e) {
            log.error("Ollama unreachable at {}: {}", uri, e.getMessage());
            throw new OllamaException("Ollama unreachable at " + uri, e);
        }

        List<String> loaded = parseLoadedModels(body, uri);
        if (loaded.isEmpty()) {
            log.error("Ollama has no model loaded; {} reported an empty list", uri);
            throw new OllamaException(
                    "No model is loaded in Ollama. Start one with 'ollama run <model>' — "
                            + uri + " reported none");
        }
        if (loaded.size() > 1) {
            log.warn("Ollama has {} models loaded {}; using {}. Stop the others to remove the "
                    + "ambiguity.", loaded.size(), loaded, loaded.get(0));
        }
        return loaded.get(0);
    }

    private List<String> parseLoadedModels(String body, String uri) {
        if (body == null || body.isBlank()) {
            throw new OllamaException("Ollama returned an empty body from " + uri);
        }
        JsonNode root;
        try {
            root = mapper.readTree(body);
        } catch (JsonProcessingException e) {
            throw new OllamaException("Ollama returned a body that is not JSON from " + uri,
                    null, truncate(body), e);
        }
        List<String> names = new ArrayList<>();
        for (JsonNode entry : root.path("models")) {
            // "name" is what `ollama ps` prints; "model" carries the same value and is the
            // fallback if a future release drops one of the two.
            JsonNode name = entry.hasNonNull("name") ? entry.path("name") : entry.path("model");
            String text = name.isMissingNode() || name.isNull() ? "" : name.asText().trim();
            if (!text.isEmpty()) {
                names.add(text);
            }
        }
        return names;
    }

    /**
     * A 2xx body with no choices is an error, not a null return: a null would surface downstream
     * as a parse failure and hide the real cause.
     */
    private String extractContent(String body) {
        if (body == null || body.isBlank()) {
            throw new OllamaException("Ollama returned an empty body");
        }
        JsonNode root;
        try {
            root = mapper.readTree(body);
        } catch (JsonProcessingException e) {
            throw new OllamaException("Ollama returned a body that is not JSON",
                    null, truncate(body), e);
        }
        JsonNode choices = root.path("choices");
        if (!choices.isArray() || choices.isEmpty()) {
            throw new OllamaException("Ollama returned a body with no choices",
                    null, truncate(body), null);
        }
        JsonNode content = choices.get(0).path("message").path("content");
        return content.isMissingNode() || content.isNull() ? "" : content.asText();
    }

    private static String truncate(String s) {
        if (s == null) {
            return null;
        }
        return s.length() <= SNIPPET_CHARS ? s : s.substring(0, SNIPPET_CHARS) + "...";
    }

    private static String stripTrailingSlash(String url) {
        String trimmed = url == null ? "" : url.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }

    /**
     * One trailing {@code /v1} removed, so the OpenAI-compatible root yields the native one. A URL
     * that does not carry the suffix is used as it stands (ADR35 decision 2) — deriving it beats a
     * second config key, because two keys that must agree will stop agreeing.
     */
    private static String stripV1Suffix(String url) {
        return url.endsWith(V1_SUFFIX) ? url.substring(0, url.length() - V1_SUFFIX.length()) : url;
    }
}
