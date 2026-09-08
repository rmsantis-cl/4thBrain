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
 */
@Component
@Slf4j
public class OllamaHttpClient implements OllamaClient {

    private static final int SNIPPET_CHARS = 200;

    private final RestTemplate restTemplate;
    private final RestTemplate probeTemplate;
    private final ConcurrencyGate gate;
    private final String baseUrl;
    private final String model;
    private final ObjectMapper mapper = new ObjectMapper();

    public OllamaHttpClient(RestTemplateBuilder builder,
                            ConcurrencyGate gate,
                            @Value("${ollama.url:http://localhost:11434/v1}") String url,
                            @Value("${ollama.model:mistral}") String model,
                            @Value("${ollama.connect-timeout-ms:5000}") long connectTimeoutMs,
                            @Value("${ollama.read-timeout-ms:120000}") long readTimeoutMs) {
        // Built here rather than declared as a @Bean: a shared RestTemplate is something
        // another component could later reconfigure out from under this client.
        this.restTemplate = builder
                .connectTimeout(Duration.ofMillis(connectTimeoutMs))
                .readTimeout(Duration.ofMillis(readTimeoutMs))
                .build();
        this.probeTemplate = builder
                .connectTimeout(Duration.ofMillis(connectTimeoutMs))
                .readTimeout(Duration.ofMillis(connectTimeoutMs))
                .build();
        this.gate = gate;
        this.baseUrl = stripTrailingSlash(url);
        this.model = model;
    }

    @Override
    public String chat(String systemPrompt, String userPrompt) throws InterruptedException {
        if (userPrompt == null) {
            throw new OllamaException("userPrompt must not be null");
        }
        // Every HTTP call goes through the gate; the gate is the only thing serialising them.
        return gate.call(() -> send(systemPrompt, userPrompt));
    }

    @Override
    public boolean isAvailable() {
        String uri = baseUrl + "/models";
        try {
            probeTemplate.getForEntity(uri, String.class);
            return true;
        } catch (Exception e) {
            log.debug("Ollama not reachable at {}: {}", uri, e.getMessage());
            return false;
        }
    }

    private String send(String systemPrompt, String userPrompt) {
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
}
