package com.fourthbrain.actuators;

import com.fourthbrain.persistence.DatabaseService;
import com.fourthbrain.persistence.VaultArea;
import com.fourthbrain.persistence.entity.Document;
import com.fourthbrain.persistence.entity.DocumentCopy;
import com.fourthbrain.service.DocumentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * The end-to-end routing of a document that takes the full path — one that is
 * not short-circuited the way a URL (Clipper), an archive (Extractor) or an
 * unsupported format (stops with a warning) is.
 *
 * <p><b>Required order:</b> {@code Ingestor → Indexer → Classifier}, with the
 * file present in the destination directory once the Indexer has run.
 *
 * <p>This asserts the intended flow, not the flow that is built. The merged
 * implementation routes {@code Ingestor → Classifier → Indexer} under ADR29 and
 * ADR31, so these tests fail today and are disabled against <b>BUG-005</b>.
 * Re-enable them when the routing is settled; they are the specification, and
 * nothing else in the suite states the chain as a whole — every existing test
 * asserts one actuator's own decision in isolation, which is exactly how the two
 * halves came to disagree.
 *
 * <p>Real objects throughout, matching {@code IndexerTest} and
 * {@code IngestorRoutingTest}: stand-in services that record what they were
 * asked to do, temporary directories for the vault areas, no Spring context and
 * no threads.
 */
@Disabled("BUG-005 — built routing is Ingestor → Classifier → Indexer; this asserts the required order")
@DisplayName("Pipeline flow (full path, no short circuit)")
class PipelineFlowTest {

    @TempDir
    Path tmpDir;

    @TempDir
    Path rawDir;

    @TempDir
    Path indexingDir;

    private RecordingDatabaseService db;
    private Ingestor ingestor;
    private Indexer indexer;
    private Classifier classifier;

    @BeforeEach
    void setUp() {
        db = new RecordingDatabaseService();

        ingestor = new Ingestor();
        ReflectionTestUtils.setField(ingestor, "vaultTmpPath", tmpDir.toString());
        ReflectionTestUtils.setField(ingestor, "vaultRawPath", rawDir.toString());
        ReflectionTestUtils.setField(ingestor, "archiveOriginal", true);
        ReflectionTestUtils.setField(ingestor, "maxNameLength", 60);
        ReflectionTestUtils.setField(ingestor, "defaultExtension", ".md");
        ReflectionTestUtils.setField(ingestor, "databaseService", db);
        ReflectionTestUtils.setField(ingestor, "documentService", new NoOpDocumentService());

        indexer = new Indexer();
        ReflectionTestUtils.setField(indexer, "vaultIndexingPath", indexingDir.toString());
        ReflectionTestUtils.setField(indexer, "sourceArea", VaultArea.TMP);
        ReflectionTestUtils.setField(indexer, "materialiseContent", true);
        ReflectionTestUtils.setField(indexer, "databaseService", db);

        classifier = new Classifier();
        ReflectionTestUtils.setField(classifier, "databaseService", db);
        // No OllamaClient: an unclassifiable document must still route on, which
        // is ADR31 decision D4. The chain is what is under test, not the tags.
        ReflectionTestUtils.setField(classifier, "ollamaClient", null);
    }

    @Test
    @Timeout(15)
    @DisplayName("a text document routes Ingestor → Indexer → Classifier and lands in the destination dir")
    void fullPathRoutesIngestorThenIndexerThenClassifier() throws IOException {
        Document doc = textDocument(1L, "meeting-notes.md", "A note long enough to be worth keeping.");

        String afterIngest = ingestor.doTheThing(doc);
        assertEquals("Indexer", afterIngest,
                "a full-path document goes from the Ingestor to the Indexer");

        String afterIndex = indexer.doTheThing(doc);
        assertEquals("Classifier", afterIndex,
                "the Indexer hands the document to the Classifier once it is in the vault");

        String afterClassify = classifier.doTheThing(doc);
        assertNull(afterClassify,
                "the Classifier is the last stage; nothing follows it");
    }

    @Test
    @Timeout(15)
    @DisplayName("the file is in the destination directory by the time the Classifier runs")
    void fileIsPublishedBeforeClassification() throws IOException {
        Document doc = textDocument(2L, "report.md", "Body text for the report.");

        ingestor.doTheThing(doc);
        indexer.doTheThing(doc);

        DocumentCopy indexed = db.added.get(2L);
        assertNotNull(indexed, "the Indexer recorded no copy in the destination area");
        assertEquals(VaultArea.INDEXING, indexed.getArea());

        Path published = Path.of(indexed.getPath());
        assertTrue(Files.exists(published), "no file at " + published);
        assertEquals(indexingDir, published.getParent(),
                "the document was not written into the configured destination directory");
        assertEquals("Body text for the report.", Files.readString(published));
    }

    /** A document as the capture endpoint creates one: content, no file on disk yet. */
    private Document textDocument(long id, String name, String content) {
        return Document.builder()
                .id(id)
                .name(name)
                .extension(".md")
                .mimeType("text/markdown")
                .content(content)
                .status("ingesting")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    /** Records copies the way {@code IndexerTest}'s does, and serves them back. */
    private static class RecordingDatabaseService extends DatabaseService {

        final Map<Long, DocumentCopy> live = new HashMap<>();
        final Map<Long, DocumentCopy> added = new HashMap<>();
        final List<String> calls = new ArrayList<>();

        RecordingDatabaseService() {
            super(null, null, null, null);
        }

        @Override
        public DocumentCopy findLive(long documentId, String area) {
            DocumentCopy copy = live.get(documentId);
            return (copy != null && copy.getArea().equals(area) && copy.isLive()) ? copy : null;
        }

        @Override
        public synchronized DocumentCopy addCopy(Document doc, String area, String path) {
            return addCopy(doc.getId(), area, path);
        }

        @Override
        public synchronized DocumentCopy addCopy(Long documentId, String area, String path) {
            calls.add("addCopy:" + area);
            DocumentCopy copy = DocumentCopy.builder()
                    .copyId(1000L + documentId + area.hashCode())
                    .documentId(documentId)
                    .area(area)
                    .path(path)
                    .createdAt(LocalDateTime.now())
                    .build();
            live.put(documentId, copy);
            added.put(documentId, copy);
            return copy;
        }

        @Override
        public synchronized DocumentCopy retire(DocumentCopy copy) {
            calls.add("retire");
            copy.setEndDate(LocalDateTime.now());
            return copy;
        }

        @Override
        public synchronized Document updateDocumentTopic(Long documentId, String topic) {
            calls.add("updateTopic");
            return null;
        }

        @Override
        public List<com.fourthbrain.persistence.entity.DocumentTag> getActiveTagsByDocumentId(Long documentId) {
            return List.of();
        }
    }

    /** The Ingestor persists metadata through this; the chain does not depend on it. */
    private static class NoOpDocumentService extends DocumentService {
        @Override
        public Document updateDocument(Long id, Document updates) {
            return updates;
        }
    }
}
