package com.fourthbrain.llm;

/**
 * A call to the local model failed: the service was unreachable, answered non-2xx, or
 * returned a body with no choices. Carries the HTTP status where there was one and a
 * truncated snippet of the body.
 *
 * Unchecked on purpose: an actuator's doTheThing() cannot declare a checked exception
 * without changing Actuator, which is frozen (P2.1).
 */
public class OllamaException extends RuntimeException {

    private final Integer status;
    private final String bodySnippet;

    public OllamaException(String message) {
        this(message, null, null, null);
    }

    public OllamaException(String message, Throwable cause) {
        this(message, null, null, cause);
    }

    public OllamaException(String message, Integer status, String bodySnippet) {
        this(message, status, bodySnippet, null);
    }

    public OllamaException(String message, Integer status, String bodySnippet, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.bodySnippet = bodySnippet;
    }

    /** The HTTP status, or null where the call never got one. */
    public Integer getStatus() {
        return status;
    }

    /** The first characters of the response body, or null where there was none. */
    public String getBodySnippet() {
        return bodySnippet;
    }
}
