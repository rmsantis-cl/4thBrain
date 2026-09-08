package com.fourthbrain.llm;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.concurrent.Callable;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

/**
 * Admits one LLM call at a time (P2.1).
 *
 * The permit count is configuration rather than a hardcoded 1, so a machine with headroom
 * can raise it without a code change. The default is 1, which is what Story P2.1 specifies.
 */
@Component
@Slf4j
public class ConcurrencyGate {

    private final Semaphore permits;
    private final long acquireTimeoutMs;

    public ConcurrencyGate(@Value("${ollama.concurrency:1}") int concurrency,
                           @Value("${ollama.acquire-timeout-ms:120000}") long acquireTimeoutMs) {
        // Fair: FIFO, so a second actuator type cannot starve behind a busy one.
        this.permits = new Semaphore(concurrency, true);
        this.acquireTimeoutMs = acquireTimeoutMs;
    }

    /**
     * Runs {@code work} holding a permit.
     *
     * @throws OllamaException      no permit came free inside the acquire timeout, or the work
     *                              itself failed with a checked exception
     * @throws InterruptedException the calling thread was interrupted while waiting or working;
     *                              the interrupt flag is restored before this is thrown
     */
    public <T> T call(Callable<T> work) throws InterruptedException {
        boolean acquired;
        try {
            acquired = permits.tryAcquire(acquireTimeoutMs, TimeUnit.MILLISECONDS);
        } catch (InterruptedException e) {
            // Restore the flag: Actuator.shutdown() interrupts its thread and the run loop
            // relies on seeing it to break out.
            Thread.currentThread().interrupt();
            throw e;
        }

        if (!acquired) {
            throw new OllamaException(
                    "Timed out after " + acquireTimeoutMs + " ms waiting for an Ollama permit");
        }

        try {
            return work.call();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw e;
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new OllamaException("Gated call failed: " + e.getMessage(), e);
        } finally {
            // A leaked permit stops the pipeline for good, so this release is unconditional.
            permits.release();
        }
    }

    /** Permits currently free. Diagnostic only — never gate on this value. */
    public int availablePermits() {
        return permits.availablePermits();
    }
}
