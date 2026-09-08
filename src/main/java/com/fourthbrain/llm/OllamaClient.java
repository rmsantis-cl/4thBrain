package com.fourthbrain.llm;

/** A call to the local model. Implementations are gated: one call is in flight at a time (P2.1). */
public interface OllamaClient {

    /**
     * Sends one prompt and returns the assistant's message content.
     *
     * @param systemPrompt instruction context, or null for none
     * @param userPrompt   the message; never null
     * @return the reply text, never null (an empty reply comes back as "")
     * @throws OllamaException      the service was unreachable, answered non-2xx, or returned
     *                              a body with no choices
     * @throws InterruptedException the calling thread was interrupted while waiting for the gate
     */
    String chat(String systemPrompt, String userPrompt) throws InterruptedException;

    /** A cheap reachability check that does not consume a gate permit. */
    boolean isAvailable();
}
