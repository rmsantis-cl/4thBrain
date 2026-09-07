package com.fourthbrain.actuators;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fourthbrain.messaging.Message;
import com.fourthbrain.persistence.entity.Document;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Story P1.11/P1.13 (ADR26) — Ingestor's routing decision, exercised end to end
 * with no mocks: a real Document goes through the real enqueue/dequeue path and
 * the real doTheThing() routing logic, and the assertion is what Ingestor
 * actually logged.
 *
 * Deliberately never calls start() on the Ingestor under test, so no thread is
 * reading its (class-wide static, per P1.9) queue — enqueueMessage() and
 * getQueue().poll() run entirely on the test thread. poll() is non-blocking: if
 * nothing is there, it returns null immediately rather than waiting, so this
 * test cannot hang regardless of what else is happening in the JVM.
 */
@DisplayName("Ingestor routing (real objects, log-verified)")
class IngestorRoutingTest {

    private Ingestor ingestor;
    private Logger ingestorLog;
    private ListAppender<ILoggingEvent> logCapture;

    @BeforeEach
    void setUp() {
        ingestor = new Ingestor();
        ingestor.assignName("Ingestor-test");

        ingestorLog = (Logger) LoggerFactory.getLogger(Ingestor.class);
        logCapture = new ListAppender<>();
        logCapture.start();
        ingestorLog.addAppender(logCapture);
    }

    @AfterEach
    void tearDown() {
        ingestorLog.detachAppender(logCapture);
    }

    /** Puts doc through the real enqueue path and hands back what doTheThing() returns. */
    private String routeThroughIngestor(Document doc) {
        ingestor.enqueueMessage(Message.to(ingestor, doc));

        Message dequeued = ingestor.getQueue().poll();
        assertNotNull(dequeued, "expected a message on Ingestor's queue — none was there");
        assertSame(doc, dequeued.getDocument(),
                "the message must carry the same Document instance that was enqueued (ADR26)");

        return ingestor.doTheThing(dequeued.getDocument());
    }

    private boolean loggedAtLevel(String levelName, String fragment) {
        return logCapture.list.stream().anyMatch(e ->
                e.getLevel().toString().equals(levelName) && e.getFormattedMessage().contains(fragment));
    }

    private static Document.DocumentBuilder baseDoc() {
        return Document.builder()
                .id(1L)
                .status("New")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("a ZIP document routes to Extractor")
    void zipRoutesToExtractor() {
        Document doc = baseDoc().name("archive.zip").mimeType("application/zip").content("").build();

        String next = routeThroughIngestor(doc);

        assertEquals("Extractor", next);
        assertTrue(loggedAtLevel("INFO", "routing to Extractor"),
                "expected an INFO log naming the route to Extractor; captured: " + formattedMessages());
    }

    @Test
    @DisplayName("a document with source_url set routes to Clipper")
    void urlRoutesToClipper() {
        Document doc = baseDoc().name("clip").sourceUrl("https://example.com/article").content("").build();

        String next = routeThroughIngestor(doc);

        assertEquals("Clipper", next);
        assertTrue(loggedAtLevel("INFO", "routing to Clipper"),
                "expected an INFO log naming the route to Clipper; captured: " + formattedMessages());
    }

    @Test
    @DisplayName("a plain text document routes to Indexer")
    void textRoutesToIndexer() {
        Document doc = baseDoc().name("note.txt").mimeType("text/plain").content("hello world").build();

        String next = routeThroughIngestor(doc);

        assertEquals("Indexer", next);
        assertTrue(loggedAtLevel("INFO", "routing to Indexer"),
                "expected an INFO log naming the route to Indexer; captured: " + formattedMessages());
    }

    @Test
    @DisplayName("an unrecognized document type logs a warning and stops the chain")
    void unrecognizedTypeWarnsAndStops() {
        Document doc = baseDoc().name("mystery.bin").mimeType("application/octet-stream").content("").build();

        String next = routeThroughIngestor(doc);

        assertNull(next, "an unrecognized document must not route anywhere");
        assertTrue(loggedAtLevel("WARN", "Document type not recognized"),
                "expected a WARN log saying the type was not recognized; captured: " + formattedMessages());
    }

    private String formattedMessages() {
        List<String> messages = logCapture.list.stream().map(ILoggingEvent::getFormattedMessage).toList();
        return String.join(" | ", messages);
    }
}
