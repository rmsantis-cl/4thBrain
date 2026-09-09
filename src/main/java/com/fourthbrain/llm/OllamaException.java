package com.fourthbrain.llm;

/**
 * A call to the local model failed (P2.1).
 *
 * Unchecked on purpose: an actuator's process() cannot declare a new checked exception
 * without changing Actuator, which is frozen.
 *
 * Carries the HTTP status where there was one, and a truncated snippet of the response
 * body so the log line names the cause rather than "something went wrong".
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

    public OllamaException(String message, Integer status, String bodySnippet, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.bodySnippet = bodySnippet;
    }

    /** HTTP status of the failing response, or null when the call never got one. */
    public Integer getStatus() {
        return status;
    }

    /** First few hundred characters of the response body, or null when there was none. */
    public String getBodySnippet() {
        return bodySnippet;
    }
}
