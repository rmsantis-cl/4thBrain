package com.fourthbrain.actuators;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fourthbrain.persistence.DatabaseService;
import com.fourthbrain.persistence.VaultArea;
import com.fourthbrain.persistence.entity.Document;
import com.fourthbrain.persistence.entity.DocumentCopy;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.io.TempDir;
import org.slf4j.LoggerFactory;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Story P2.5 Part A — the vault write.
 *
 * Real objects throughout: a stand-in DatabaseService that records what it was
 * asked to do, temporary directories for the source area and the indexing area,
 * and the Indexer's own Logback output for the error cases. Nothing here starts
 * a thread or a Spring context.
 *
 * <p>A successful index hands the document to the Classifier, which runs after
 * this stage (BUG-005). The paths that stop — nothing to index, a source file
 * that is gone — still return null.
 */
@DisplayName("Indexer Tests")
class IndexerTest {

    @TempDir
    Path sourceDir;

    @TempDir
    Path indexingDir;

    private RecordingDatabaseService db;
    private Indexer indexer;
    private ListAppender<ILoggingEvent> logged;
    private Logger indexerLogger;

    @BeforeEach
    void setUp() {
        db = new RecordingDatabaseService();
        indexer = new Indexer();
        ReflectionTestUtils.setField(indexer, "vaultIndexingPath", indexingDir.toString());
        ReflectionTestUtils.setField(indexer, "sourceArea", VaultArea.TMP);
        ReflectionTestUtils.setField(indexer, "materialiseContent", true);
        ReflectionTestUtils.setField(indexer, "databaseService", db);

        indexerLogger = (Logger) LoggerFactory.getLogger(Indexer.class);
        logged = new ListAppender<>();
        logged.start();
        indexerLogger.addAppender(logged);
    }

    @AfterEach
    void tearDown() {
        indexerLogger.detachAppender(logged);
        logged.stop();
    }

    @Test
    @Timeout(15)
    @DisplayName("two documents whose files share a name get distinct destinations")
    void sameFileNameDoesNotCollide() throws IOException {
        // Two uploads of the same file name, one after the other, which is how
        // they arrive: the first leaves the source area before the second lands.
        indexer.doTheThing(documentWithFile(1L, "notes.md", "first document"));
        indexer.doTheThing(documentWithFile(2L, "notes.md", "second document"));

        Path firstDest = Path.of(db.pathAdded(1L));
        Path secondDest = Path.of(db.pathAdded(2L));

        assertNotEquals(firstDest, secondDest, "the second document overwrote the first");
        assertEquals("first document", Files.readString(firstDest));
        assertEquals("second document", Files.readString(secondDest));
        assertEquals("notes.md", firstDest.getFileName().toString());
        assertEquals("notes_001.md", secondDest.getFileName().toString());
    }

    @Test
    @Timeout(15)
    @DisplayName("a content-only document is materialised into the indexing area")
    void contentOnlyDocumentIsMaterialised() throws IOException {
        Document doc = new Document("standup", "- shipped the indexer\n");
        doc.setId(7L);

        assertEquals("Classifier", indexer.doTheThing(doc),
                "a published document is handed on to be classified (BUG-005)");

        Path dest = Path.of(db.pathAdded(7L));
        assertTrue(Files.exists(dest));
        assertEquals("standup.md", dest.getFileName().toString());
        assertEquals("- shipped the indexer\n", Files.readString(dest));
        assertEquals(VaultArea.INDEXING, db.areaAdded(7L));
    }

    @Test
    @Timeout(15)
    @DisplayName("a document with neither a file nor content is left alone, with a warning")
    void nothingToIndexWarns() {
        Document doc = new Document("empty", "   ");
        doc.setId(8L);

        assertNull(indexer.doTheThing(doc));

        assertTrue(db.calls.isEmpty(), "nothing should have been recorded: " + db.calls);
        assertTrue(loggedAt(Level.WARN).stream().anyMatch(m -> m.contains("No live copy")),
                "expected a warning naming the missing copy, got " + loggedAt(Level.WARN));
    }

    @Test
    @Timeout(15)
    @DisplayName("the destination copy is added before the source copy is retired")
    void addsDestinationBeforeRetiringSource() throws IOException {
        Document doc = documentWithFile(3L, "report.txt", "body");

        assertEquals("Classifier", indexer.doTheThing(doc),
                "the file path also hands on to the Classifier (BUG-005)");

        assertEquals(List.of("addCopy", "retire"), db.calls,
                "addCopy must come first: a crash between the two should leave two live copies, "
                        + "never a file with no row");
        assertFalse(db.sources.get(3L).isLive(), "the source copy should be retired");
        assertFalse(Files.exists(sourceDir.resolve("report.txt")),
                "the source file should have been removed once the vault copy was in place");
    }

    @Test
    @Timeout(15)
    @DisplayName("a copy row pointing at a file that is gone logs at ERROR and stops")
    void missingSourceFileIsAnError() throws IOException {
        Document doc = new Document("ghost.md", null);
        doc.setId(4L);
        db.sources.put(4L, copy(4L, sourceDir.resolve("ghost.md")));

        assertNull(indexer.doTheThing(doc));

        assertTrue(db.calls.isEmpty(), "nothing should have been recorded: " + db.calls);
        assertTrue(loggedAt(Level.ERROR).stream().anyMatch(m -> m.contains("ghost.md")),
                "expected an error naming the missing file, got " + loggedAt(Level.ERROR));
        assertTrue(indexingDirIsEmpty(), "nothing should have reached the indexing area");
    }

    @Test
    @Timeout(15)
    @DisplayName("a non-ASCII note round-trips byte for byte")
    void nonAsciiRoundTrips() throws IOException {
        String text = "em dash — accents éàü — 漢字 — emoji 🧠\n";
        Document doc = new Document("unicode", text);
        doc.setId(5L);

        indexer.doTheThing(doc);

        Path dest = Path.of(db.pathAdded(5L));
        assertArrayEquals(text.getBytes(StandardCharsets.UTF_8), Files.readAllBytes(dest));
    }

    @Test
    @Timeout(15)
    @DisplayName("no .part file survives a successful index, on either path")
    void noPartFileSurvives() throws IOException {
        indexer.doTheThing(documentWithFile(6L, "moved.md", "from a file"));

        Document typed = new Document("typed", "from content");
        typed.setId(9L);
        indexer.doTheThing(typed);

        try (DirectoryStream<Path> entries = Files.newDirectoryStream(indexingDir, "*.part")) {
            assertFalse(entries.iterator().hasNext(), "a partial file was left behind");
        }
    }

    // ---- helpers ----

    private Document documentWithFile(long id, String fileName, String body) throws IOException {
        Path file = sourceDir.resolve(fileName);
        Files.writeString(file, body);
        Document doc = new Document(fileName, null);
        doc.setId(id);
        db.sources.put(id, copy(id, file));
        return doc;
    }

    private DocumentCopy copy(long documentId, Path path) {
        return DocumentCopy.builder()
                .copyId(documentId)
                .documentId(documentId)
                .area(VaultArea.TMP)
                .path(path.toString())
                .createdAt(LocalDateTime.now())
                .build();
    }

    private boolean indexingDirIsEmpty() throws IOException {
        try (DirectoryStream<Path> entries = Files.newDirectoryStream(indexingDir)) {
            return !entries.iterator().hasNext();
        }
    }

    private List<String> loggedAt(Level level) {
        return logged.list.stream()
                .filter(e -> e.getLevel() == level)
                .map(ILoggingEvent::getFormattedMessage)
                .toList();
    }

    /**
     * Stands in for the real service without a database behind it: the Indexer
     * only asks it three things, and the order it asks them in is part of what
     * this test is checking.
     */
    private static class RecordingDatabaseService extends DatabaseService {

        final Map<Long, DocumentCopy> sources = new HashMap<>();
        final Map<Long, DocumentCopy> added = new HashMap<>();
        final List<String> calls = new ArrayList<>();

        RecordingDatabaseService() {
            super(null, null, null, null);
        }

        @Override
        public DocumentCopy findLive(long documentId, String area) {
            DocumentCopy source = sources.get(documentId);
            return (source != null && source.getArea().equals(area) && source.isLive()) ? source : null;
        }

        @Override
        public synchronized DocumentCopy addCopy(Document doc, String area, String path) {
            calls.add("addCopy");
            DocumentCopy copy = DocumentCopy.builder()
                    .copyId(1000L + doc.getId())
                    .documentId(doc.getId())
                    .area(area)
                    .path(path)
                    .createdAt(LocalDateTime.now())
                    .build();
            added.put(doc.getId(), copy);
            return copy;
        }

        @Override
        public synchronized DocumentCopy retire(DocumentCopy copy) {
            calls.add("retire");
            copy.setEndDate(LocalDateTime.now());
            return copy;
        }

        String pathAdded(long documentId) {
            DocumentCopy copy = added.get(documentId);
            assertNotNull(copy, "no indexing copy was recorded for doc=" + documentId);
            return copy.getPath();
        }

        String areaAdded(long documentId) {
            return added.get(documentId).getArea();
        }
    }
}
