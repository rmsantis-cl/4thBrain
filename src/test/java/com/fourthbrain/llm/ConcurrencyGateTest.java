package com.fourthbrain.llm;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Story P2.1 — the gate admits one call at a time.
 *
 * Plain JUnit, no Spring context, and every wait is a latch rather than a sleep: the suite
 * treats a slow method as a failure.
 */
@DisplayName("ConcurrencyGate Tests")
class ConcurrencyGateTest {

    @Test
    @DisplayName("with one permit the second caller waits for the first to return")
    void secondCallerWaits() throws Exception {
        ConcurrencyGate gate = new ConcurrencyGate(1, 5_000);

        CountDownLatch firstInside = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch secondInside = new CountDownLatch(1);
        AtomicBoolean firstFinished = new AtomicBoolean(false);
        AtomicBoolean overlapped = new AtomicBoolean(false);

        Thread first = new Thread(() -> quietly(() -> gate.call(() -> {
            firstInside.countDown();
            releaseFirst.await();
            firstFinished.set(true);
            return "first";
        })));

        Thread second = new Thread(() -> quietly(() -> gate.call(() -> {
            if (!firstFinished.get()) {
                overlapped.set(true);
            }
            secondInside.countDown();
            return "second";
        })));

        first.start();
        assertTrue(firstInside.await(2, TimeUnit.SECONDS), "first caller never entered");

        second.start();
        assertFalse(secondInside.await(250, TimeUnit.MILLISECONDS),
                "second caller entered while the first still held the permit");

        releaseFirst.countDown();
        assertTrue(secondInside.await(2, TimeUnit.SECONDS), "second caller never entered");
        assertFalse(overlapped.get(), "the two calls overlapped");

        first.join(2_000);
        second.join(2_000);
        assertEquals(1, gate.availablePermits(), "the permit was not returned");
    }

    @Test
    @DisplayName("a call that throws still returns its permit")
    void throwingCallReleasesPermit() throws Exception {
        ConcurrencyGate gate = new ConcurrencyGate(1, 1_000);

        assertThrows(IllegalStateException.class,
                () -> gate.call(() -> {
                    throw new IllegalStateException("boom");
                }));

        assertEquals(1, gate.availablePermits(), "a failing call leaked the permit");
        assertEquals("after", gate.call(() -> "after"), "the gate is unusable after a failure");
    }

    @Test
    @DisplayName("a checked exception from the work is wrapped in OllamaException")
    void checkedExceptionIsWrapped() {
        ConcurrencyGate gate = new ConcurrencyGate(1, 1_000);

        OllamaException thrown = assertThrows(OllamaException.class,
                () -> gate.call(() -> {
                    throw new java.io.IOException("disk on fire");
                }));

        assertTrue(thrown.getMessage().contains("disk on fire"));
        assertEquals(1, gate.availablePermits());
    }

    @Test
    @DisplayName("waiting past the acquire timeout throws OllamaException instead of blocking")
    void acquireTimeoutThrows() throws Exception {
        ConcurrencyGate gate = new ConcurrencyGate(1, 100);

        CountDownLatch holderInside = new CountDownLatch(1);
        CountDownLatch releaseHolder = new CountDownLatch(1);
        Thread holder = new Thread(() -> quietly(() -> gate.call(() -> {
            holderInside.countDown();
            releaseHolder.await();
            return "held";
        })));
        holder.start();
        assertTrue(holderInside.await(2, TimeUnit.SECONDS));

        OllamaException thrown = assertThrows(OllamaException.class, () -> gate.call(() -> "never"));
        assertTrue(thrown.getMessage().contains("100"),
                "the message should name the wait it gave up on: " + thrown.getMessage());

        releaseHolder.countDown();
        holder.join(2_000);
    }

    @Test
    @DisplayName("interrupting a waiting caller throws InterruptedException with the flag restored")
    void interruptPropagatesWithFlagSet() throws Exception {
        ConcurrencyGate gate = new ConcurrencyGate(1, 30_000);

        CountDownLatch holderInside = new CountDownLatch(1);
        CountDownLatch releaseHolder = new CountDownLatch(1);
        Thread holder = new Thread(() -> quietly(() -> gate.call(() -> {
            holderInside.countDown();
            releaseHolder.await();
            return "held";
        })));
        holder.start();
        assertTrue(holderInside.await(2, TimeUnit.SECONDS));

        CountDownLatch waiterStarted = new CountDownLatch(1);
        CountDownLatch waiterDone = new CountDownLatch(1);
        AtomicReference<Throwable> caught = new AtomicReference<>();
        AtomicBoolean flagStillSet = new AtomicBoolean(false);

        Thread waiter = new Thread(() -> {
            waiterStarted.countDown();
            try {
                gate.call(() -> "never");
            } catch (Throwable t) {
                caught.set(t);
                flagStillSet.set(Thread.currentThread().isInterrupted());
            } finally {
                waiterDone.countDown();
            }
        });
        waiter.start();
        assertTrue(waiterStarted.await(2, TimeUnit.SECONDS));

        // Let the waiter park inside tryAcquire before interrupting it. Bounded, so a
        // thread that never parks fails the assertion below instead of spinning forever.
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(2);
        while (waiter.getState() != Thread.State.TIMED_WAITING
                && waiter.getState() != Thread.State.WAITING
                && System.nanoTime() < deadline) {
            Thread.onSpinWait();
        }
        waiter.interrupt();

        assertTrue(waiterDone.await(3, TimeUnit.SECONDS), "the interrupted waiter never returned");
        assertInstanceOf(InterruptedException.class, caught.get(),
                "expected InterruptedException, got " + caught.get());
        assertTrue(flagStillSet.get(), "the interrupt flag was swallowed");

        releaseHolder.countDown();
        holder.join(2_000);
        waiter.join(2_000);
    }

    /** Runs work whose checked exceptions the test does not care about. */
    private static void quietly(ThrowingRunnable work) {
        try {
            work.run();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private interface ThrowingRunnable {
        void run() throws Exception;
    }
}
