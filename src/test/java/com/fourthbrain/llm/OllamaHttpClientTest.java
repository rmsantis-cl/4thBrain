package com.fourthbrain.llm;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

/**
 * Story P2.1 — transport behaviour of the Ollama client, against a mock server.
 *
 * No live call: a real round trip against a 7B model can outrun the suite's per-method
 * budget on a cold model load, which would fail the build for a reason unrelated to the code.
 */
@DisplayName("OllamaHttpClient Tests")
class OllamaHttpClientTest {

    /** Matches application.yaml: the configured URL already carries the /v1 suffix. */
    private static final String BASE_URL = "http://localhost:11434/v1";
    private static final String CHAT_URI = BASE_URL + "/chat/completions";

    private static final String OK_BODY = """
            {
              "id": "chatcmpl-1",
              "choices": [
                { "index": 0, "message": { "role": "assistant", "content": "pong" } }
              ]
            }
            """;

    private OllamaHttpClient client;
    private MockRestServiceServer server;

    @BeforeEach
    void setUp() {
        client = new OllamaHttpClient(
                new RestTemplateBuilder(),
                new ConcurrencyGate(1, 5_000),
                BASE_URL,
                "mistral",
                1_000,
                2_000);
        RestTemplate restTemplate = (RestTemplate) ReflectionTestUtils.getField(client, "restTemplate");
        server = MockRestServiceServer.bindTo(restTemplate).build();
    }

    @Test
    @DisplayName("posts once to <url>/chat/completions and returns the assistant content")
    void parsesTheReply() throws Exception {
        server.expect(once(), requestTo(CHAT_URI))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.model").value("mistral"))
                .andExpect(jsonPath("$.stream").value(false))
                .andRespond(withSuccess(OK_BODY, MediaType.APPLICATION_JSON));

        assertEquals("pong", client.chat("be terse", "ping"));
        server.verify();
    }

    @Test
    @DisplayName("a null system prompt produces a one-message array")
    void nullSystemPromptIsOmitted() throws Exception {
        server.expect(once(), requestTo(CHAT_URI))
                .andExpect(jsonPath("$.messages.length()").value(1))
                .andExpect(jsonPath("$.messages[0].role").value("user"))
                .andExpect(jsonPath("$.messages[0].content").value("ping"))
                .andRespond(withSuccess(OK_BODY, MediaType.APPLICATION_JSON));

        assertEquals("pong", client.chat(null, "ping"));
        server.verify();
    }

    @Test
    @DisplayName("a system prompt is sent ahead of the user message")
    void systemPromptLeadsTheArray() throws Exception {
        server.expect(once(), requestTo(CHAT_URI))
                .andExpect(jsonPath("$.messages.length()").value(2))
                .andExpect(jsonPath("$.messages[0].role").value("system"))
                .andExpect(jsonPath("$.messages[0].content").value("be terse"))
                .andExpect(jsonPath("$.messages[1].role").value("user"))
                .andRespond(withSuccess(OK_BODY, MediaType.APPLICATION_JSON));

        assertEquals("pong", client.chat("be terse", "ping"));
        server.verify();
    }

    @Test
    @DisplayName("HTTP 500 raises OllamaException carrying the status")
    void serverErrorIsWrapped() {
        server.expect(once(), requestTo(CHAT_URI))
                .andRespond(withServerError().body("model runner crashed"));

        OllamaException thrown = assertThrows(OllamaException.class, () -> client.chat(null, "ping"));
        assertNotNull(thrown.getStatus());
        assertEquals(500, thrown.getStatus().intValue());
        assertTrue(thrown.getBodySnippet().contains("model runner crashed"));
        server.verify();
    }

    @Test
    @DisplayName("a 2xx body with no choices raises OllamaException rather than returning null")
    void emptyChoicesIsAnError() {
        server.expect(once(), requestTo(CHAT_URI))
                .andRespond(withSuccess("{\"choices\": []}", MediaType.APPLICATION_JSON));

        OllamaException thrown = assertThrows(OllamaException.class, () -> client.chat(null, "ping"));
        assertTrue(thrown.getMessage().contains("no choices"), thrown.getMessage());
        assertNull(thrown.getStatus(), "an empty-choices failure has no HTTP status of its own");
        server.verify();
    }

    @Test
    @DisplayName("a null user prompt is rejected before any request goes out")
    void nullUserPromptIsRejected() {
        assertThrows(OllamaException.class, () -> client.chat("be terse", null));
        server.verify();
    }
}
