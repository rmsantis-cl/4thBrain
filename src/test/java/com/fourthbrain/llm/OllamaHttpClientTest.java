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
 * Story P2.12 / ADR35 — the model comes from /api/ps rather than from configuration.
 *
 * Two mock servers, because the client uses two RestTemplates: the chat call carries the
 * generation read timeout, and the /api/ps lookup carries the short one.
 *
 * No live call: a real round trip against a 7B model can outrun the suite's per-method
 * budget on a cold model load, which would fail the build for a reason unrelated to the code.
 */
@DisplayName("OllamaHttpClient Tests")
class OllamaHttpClientTest {

    /** Matches application.yaml: the configured URL already carries the /v1 suffix. */
    private static final String BASE_URL = "http://localhost:11434/v1";
    private static final String CHAT_URI = BASE_URL + "/chat/completions";
    /** ADR35 decision 2: the native root is the configured URL with /v1 stripped. */
    private static final String PS_URI = "http://localhost:11434/api/ps";

    private static final String LOADED_MODEL = "gemma4:12b";

    private static final String PS_ONE = """
            { "models": [ { "name": "gemma4:12b", "model": "gemma4:12b" } ] }
            """;
    private static final String PS_TWO = """
            { "models": [
              { "name": "gemma4:12b", "model": "gemma4:12b" },
              { "name": "devstral:24b", "model": "devstral:24b" }
            ] }
            """;
    private static final String PS_NONE = "{ \"models\": [] }";

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
    private MockRestServiceServer psServer;

    @BeforeEach
    void setUp() {
        client = newClient(BASE_URL);
        server = bind(client, "restTemplate");
        psServer = bind(client, "probeTemplate");
    }

    private static OllamaHttpClient newClient(String url) {
        return new OllamaHttpClient(
                new RestTemplateBuilder(),
                new ConcurrencyGate(1, 5_000),
                url,
                1_000,
                2_000);
    }

    private static MockRestServiceServer bind(OllamaHttpClient target, String field) {
        RestTemplate template = (RestTemplate) ReflectionTestUtils.getField(target, field);
        return MockRestServiceServer.bindTo(template).build();
    }

    /** One model loaded, which is the ordinary case every chat test needs. */
    private void expectPs(String body) {
        psServer.expect(once(), requestTo(PS_URI))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
    }

    private void verifyBoth() {
        psServer.verify();
        server.verify();
    }

    @Test
    @DisplayName("posts once to <url>/chat/completions and names the model /api/ps reported")
    void parsesTheReply() throws Exception {
        expectPs(PS_ONE);
        server.expect(once(), requestTo(CHAT_URI))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.model").value(LOADED_MODEL))
                .andExpect(jsonPath("$.stream").value(false))
                .andRespond(withSuccess(OK_BODY, MediaType.APPLICATION_JSON));

        assertEquals("pong", client.chat("be terse", "ping"));
        verifyBoth();
    }

    @Test
    @DisplayName("a null system prompt produces a one-message array")
    void nullSystemPromptIsOmitted() throws Exception {
        expectPs(PS_ONE);
        server.expect(once(), requestTo(CHAT_URI))
                .andExpect(jsonPath("$.messages.length()").value(1))
                .andExpect(jsonPath("$.messages[0].role").value("user"))
                .andExpect(jsonPath("$.messages[0].content").value("ping"))
                .andRespond(withSuccess(OK_BODY, MediaType.APPLICATION_JSON));

        assertEquals("pong", client.chat(null, "ping"));
        verifyBoth();
    }

    @Test
    @DisplayName("a system prompt is sent ahead of the user message")
    void systemPromptLeadsTheArray() throws Exception {
        expectPs(PS_ONE);
        server.expect(once(), requestTo(CHAT_URI))
                .andExpect(jsonPath("$.messages.length()").value(2))
                .andExpect(jsonPath("$.messages[0].role").value("system"))
                .andExpect(jsonPath("$.messages[0].content").value("be terse"))
                .andExpect(jsonPath("$.messages[1].role").value("user"))
                .andRespond(withSuccess(OK_BODY, MediaType.APPLICATION_JSON));

        assertEquals("pong", client.chat("be terse", "ping"));
        verifyBoth();
    }

    @Test
    @DisplayName("HTTP 500 raises OllamaException carrying the status")
    void serverErrorIsWrapped() {
        expectPs(PS_ONE);
        server.expect(once(), requestTo(CHAT_URI))
                .andRespond(withServerError().body("model runner crashed"));

        OllamaException thrown = assertThrows(OllamaException.class, () -> client.chat(null, "ping"));
        assertNotNull(thrown.getStatus());
        assertEquals(500, thrown.getStatus().intValue());
        assertTrue(thrown.getBodySnippet().contains("model runner crashed"));
        verifyBoth();
    }

    @Test
    @DisplayName("a 2xx body with no choices raises OllamaException rather than returning null")
    void emptyChoicesIsAnError() {
        expectPs(PS_ONE);
        server.expect(once(), requestTo(CHAT_URI))
                .andRespond(withSuccess("{\"choices\": []}", MediaType.APPLICATION_JSON));

        OllamaException thrown = assertThrows(OllamaException.class, () -> client.chat(null, "ping"));
        assertTrue(thrown.getMessage().contains("no choices"), thrown.getMessage());
        assertNull(thrown.getStatus(), "an empty-choices failure has no HTTP status of its own");
        verifyBoth();
    }

    @Test
    @DisplayName("a null user prompt is rejected before any request goes out")
    void nullUserPromptIsRejected() {
        assertThrows(OllamaException.class, () -> client.chat("be terse", null));
        verifyBoth();
    }

    @Test
    @DisplayName("nothing loaded fails the call, and no request reaches /chat/completions")
    void nothingLoadedFailsBeforeTheChatCall() {
        expectPs(PS_NONE);

        OllamaException thrown = assertThrows(OllamaException.class, () -> client.chat(null, "ping"));
        assertTrue(thrown.getMessage().contains("ollama run"),
                "the message has to name the fix: " + thrown.getMessage());
        assertNull(thrown.getStatus(), "nothing loaded is not an HTTP failure");
        // No expectation was set on the chat server, so verify() proves nothing was posted.
        verifyBoth();
    }

    @Test
    @DisplayName("two models loaded uses the first one /api/ps reported")
    void twoLoadedUsesTheFirst() throws Exception {
        expectPs(PS_TWO);
        server.expect(once(), requestTo(CHAT_URI))
                .andExpect(jsonPath("$.model").value(LOADED_MODEL))
                .andRespond(withSuccess(OK_BODY, MediaType.APPLICATION_JSON));

        assertEquals("pong", client.chat(null, "ping"));
        verifyBoth();
    }

    @Test
    @DisplayName("a model list entry without a name falls back to its model field")
    void nameFallsBackToModelField() throws Exception {
        expectPs("{ \"models\": [ { \"model\": \"qwen3:4b\" } ] }");
        server.expect(once(), requestTo(CHAT_URI))
                .andExpect(jsonPath("$.model").value("qwen3:4b"))
                .andRespond(withSuccess(OK_BODY, MediaType.APPLICATION_JSON));

        assertEquals("pong", client.chat(null, "ping"));
        verifyBoth();
    }

    @Test
    @DisplayName("a URL without the /v1 suffix is used as it stands for /api/ps")
    void nativeRootIsDerivedNotConfigured() throws Exception {
        OllamaHttpClient plain = newClient("http://localhost:11434/custom");
        MockRestServiceServer plainChat = bind(plain, "restTemplate");
        MockRestServiceServer plainPs = bind(plain, "probeTemplate");

        plainPs.expect(once(), requestTo("http://localhost:11434/custom/api/ps"))
                .andRespond(withSuccess(PS_ONE, MediaType.APPLICATION_JSON));
        plainChat.expect(once(), requestTo("http://localhost:11434/custom/chat/completions"))
                .andRespond(withSuccess(OK_BODY, MediaType.APPLICATION_JSON));

        assertEquals("pong", plain.chat(null, "ping"));
        plainPs.verify();
        plainChat.verify();
    }

    @Test
    @DisplayName("isAvailable is false against a reachable server with nothing loaded")
    void isAvailableIsFalseWhenNothingIsLoaded() {
        expectPs(PS_NONE);
        assertFalse(client.isAvailable());
        verifyBoth();
    }

    @Test
    @DisplayName("isAvailable is true when a model is loaded")
    void isAvailableIsTrueWhenAModelIsLoaded() {
        expectPs(PS_ONE);
        assertTrue(client.isAvailable());
        verifyBoth();
    }
}
