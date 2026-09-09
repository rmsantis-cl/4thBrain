package com.fourthbrain.actuators;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;

import com.fourthbrain.messaging.Message;
import com.fourthbrain.persistence.entity.Document;
import com.fourthbrain.service.DocumentService;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Story P1.15 — orderly shutdown.
 *
 * Deliberately not a @SpringBootTest. Actuator queues are static per class
 * (P1.9), so a real actuator started here would race whatever else the test JVM
 * enqueues. TestActuator carries its own queue and registers with no
 * Coordinator, so nothing here is visible to another test.
 */
@DisplayName("Actuator Shutdown Tests")
class ActuatorShutdownTest {

    /** Each instance gets its own queue, so tests do not leak into each other. */
    private static class TestActuator extends Actuator {

        private final BlockingQueue<Message> queue = new LinkedBlockingQueue<>();
        private final List<String> statuses = new ArrayList<>();

        /** Released before doTheThing returns; null means it does not block. */
        private CountDownLatch release;
        private CountDownLatch entered;

        @Override
        protected BlockingQueue<Message> getQueue() {
            return queue;
        }

        @Override
        public String getGerund() {
            return "testing";
        }

        @Override
        public String getParticiple() {
            return "tested";
        }

        @Override
        public String doTheThing(Document document) {
            if (entered != null) {
                entered.countDown();
            }
            if (release != null) {
                try {
                    // Not interruptible on purpose: this stands in for work that
                    // does not abandon itself when the thread is interrupted.
                    release.await(5, TimeUnit.SECONDS);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
            return null;
        }
    }

    private TestActuator actuator;
    private ListAppender<ILoggingEvent> appender;
    private ch.qos.logback.classic.Logger logger;

    @BeforeEach
    void setUp() {
        actuator = new TestActuator();

        DocumentService service = mock(DocumentService.class);
        when(service.setStatus(any(Document.class), anyString())).thenAnswer(call -> {
            actuator.statuses.add(call.getArgument(1));
            return call.getArgument(0);
        });
        ReflectionTestUtils.setField(actuator, "service", service);

        // Actuator logs through LoggerFactory.getLogger(getClass()).
        logger = (ch.qos.logback.classic.Logger) LoggerFactory.getLogger(TestActuator.class);
        logger.setLevel(Level.INFO);
        appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
    }

    @AfterEach
    void tearDown() {
        logger.detachAppender(appender);
        actuator.shutdown();
    }

    private long exitingCount() {
        return appender.list.stream()
                .filter(e -> "Thread exiting.".equals(e.getFormattedMessage()))
                .count();
    }

    private static Document doc(long id) {
        return Document.builder().id(id).name("doc-" + id).status("New").build();
    }

    @Test
    @DisplayName("shutdown() stops an idle thread well inside the 5 second bound")
    void shutdownStopsAnIdleThread() throws Exception {
        actuator.start();
        // Give the loop time to reach take() so the interrupt lands there.
        Thread.sleep(200);

        long started = System.currentTimeMillis();
        actuator.shutdown();
        actuator.join(5000);
        long elapsed = System.currentTimeMillis() - started;

        assertFalse(actuator.isAlive(), "thread did not exit within 5 seconds");
        assertTrue(elapsed < 5000, "shutdown took " + elapsed + " ms, which is not inside the bound");
    }

    @Test
    @DisplayName("Thread exiting. is logged exactly once")
    void exitIsLoggedOnce() throws Exception {
        actuator.start();
        Thread.sleep(200);

        actuator.shutdown();
        actuator.join(5000);

        assertFalse(actuator.isAlive());
        assertEquals(1, exitingCount(), "'Thread exiting.' should be logged once per actuator");
    }

    @Test
    @DisplayName("a document already being processed finishes before the thread exits")
    void inFlightWorkFinishes() throws Exception {
        actuator.entered = new CountDownLatch(1);
        actuator.release = new CountDownLatch(1);

        actuator.start();
        actuator.enqueueMessage(Message.to(actuator, doc(7L)));

        assertTrue(actuator.entered.await(5, TimeUnit.SECONDS), "doTheThing never started");

        // Shutdown lands while the document is in flight.
        actuator.shutdown();
        actuator.release.countDown();
        actuator.join(5000);

        assertFalse(actuator.isAlive());
        assertEquals(List.of("testing", "tested"), actuator.statuses,
                "an in-flight document must reach its participle before the loop exits");
        assertEquals(1, exitingCount());
    }

    @Test
    @DisplayName("shutdown() on an already-stopped actuator is a no-op")
    void shutdownIsIdempotent() throws Exception {
        actuator.start();
        Thread.sleep(200);

        actuator.shutdown();
        actuator.join(5000);
        assertFalse(actuator.isAlive());

        assertDoesNotThrow(() -> {
            actuator.shutdown();
            actuator.shutdown();
        });
        assertFalse(actuator.isAlive());
        assertEquals(1, exitingCount(), "repeat shutdowns must not restart or re-log the loop");
    }

    @Test
    @DisplayName("shutdown() before start() leaves a thread that never runs")
    void shutdownBeforeStartIsSafe() throws Exception {
        assertDoesNotThrow(() -> actuator.shutdown());
        actuator.join(1000);
        assertFalse(actuator.isAlive());
        assertEquals(0, exitingCount());
    }
}
