package com.fourthbrain.service;

import com.fourthbrain.actuators.Actuator;
import com.fourthbrain.actuators.ActuatorManager;
import com.fourthbrain.messaging.Message;
import com.fourthbrain.persistence.DatabaseService;
import com.fourthbrain.persistence.VaultArea;
import com.fourthbrain.persistence.entity.Document;
import com.fourthbrain.persistence.entity.DocumentCopy;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

/**
 * Story P1.16 — crash recovery.
 *
 * Plain unit test. The stages come from a mocked ActuatorManager rather than the
 * Coordinator's static registry, so nothing here registers an actuator that a
 * later test would count, and no production static queue is written to.
 */
@DisplayName("RecoveryService Tests")
class RecoveryServiceTest {

    /** Stands in for one pipeline stage; carries its own queue. */
    private static class Stage extends Actuator {

        private final BlockingQueue<Message> queue = new LinkedBlockingQueue<>();
        private final String gerund;
        private final String participle;

        Stage(String gerund, String participle) {
            this.gerund = gerund;
            this.participle = participle;
            assignName(gerund + "-stage");
        }

        @Override
        protected BlockingQueue<Message> getQueue() {
            return queue;
        }

        @Override
        public String getGerund() {
            return gerund;
        }

        @Override
        public String getParticiple() {
            return participle;
        }

        @Override
        public String doTheThing(Document document) {
            return null;
        }
    }

    private static final long ONE_HOUR_MS = 3_600_000L;

    private RecoveryService recovery;
    private ActuatorManager manager;
    private DocumentService documents;
    private DatabaseService database;

    private Stage ingestor;
    private Stage classifier;
    private Stage indexer;

    @BeforeEach
    void setUp() {
        ingestor = new Stage("ingesting", "ingested");
        classifier = new Stage("classifying", "classified");
        indexer = new Stage("indexing", "indexed");

        manager = mock(ActuatorManager.class);
        when(manager.getInstances()).thenReturn(List.of(ingestor, classifier, indexer));

        documents = mock(DocumentService.class);
        when(documents.getDocumentsByStatus(anyString())).thenReturn(List.of());

        database = mock(DatabaseService.class);

        recovery = new RecoveryService();
        ReflectionTestUtils.setField(recovery, "actuatorManager", manager);
        ReflectionTestUtils.setField(recovery, "documentService", documents);
        ReflectionTestUtils.setField(recovery, "databaseService", database);
        ReflectionTestUtils.setField(recovery, "staleAfterMs", ONE_HOUR_MS);
    }

    private static Document doc(long id, String status, LocalDateTime updated) {
        return Document.builder()
                .id(id)
                .name("doc-" + id)
                .status(status)
                .createdAt(updated)
                .updatedAt(updated)
                .build();
    }

    private static List<Long> queuedIds(Stage stage) {
        return stage.queue.stream().map(m -> m.getDocument().getId()).toList();
    }

    @Test
    @DisplayName("a document stuck in ingesting for over an hour is requeued to the first stage")
    void staleIngestingIsRequeued() {
        Document stale = doc(1L, "ingesting", LocalDateTime.now().minusHours(3));
        when(documents.getDocumentsByStatus("ingesting")).thenReturn(List.of(stale));

        RecoveryService.RecoveryReport report = recovery.recover();

        assertEquals(List.of(1L), queuedIds(ingestor));
        assertEquals(1, report.requeued());
        assertEquals(1, report.byStage().get("ingesting"));
    }

    @Test
    @DisplayName("a document in a transient status for under an hour is left alone")
    void freshTransientIsLeftAlone() {
        Document fresh = doc(2L, "classifying", LocalDateTime.now().minusMinutes(5));
        when(documents.getDocumentsByStatus("classifying")).thenReturn(List.of(fresh));

        RecoveryService.RecoveryReport report = recovery.recover();

        assertTrue(queuedIds(classifier).isEmpty(), "a document still in progress must not be requeued");
        assertEquals(0, report.requeued());
        assertEquals(1, report.leftAlone());
    }

    @Test
    @DisplayName("a document with no recorded update is treated as stale")
    void nullTimestampIsStale() {
        Document never = doc(3L, "classifying", null);
        when(documents.getDocumentsByStatus("classifying")).thenReturn(List.of(never));

        recovery.recover();

        assertEquals(List.of(3L), queuedIds(classifier));
    }

    @Test
    @DisplayName("a stale document in indexing whose file is in the vault is marked indexed")
    void indexingPresentInVaultIsReconciled(@TempDir Path vault) throws Exception {
        Path file = vault.resolve("already-there.md");
        Files.writeString(file, "content");

        Document stale = doc(4L, "indexing", LocalDateTime.now().minusHours(2));
        when(documents.getDocumentsByStatus("indexing")).thenReturn(List.of(stale));
        when(database.findLive(4L, VaultArea.INDEXING)).thenReturn(
                DocumentCopy.builder().documentId(4L).area(VaultArea.INDEXING)
                        .path(file.toString()).build());

        RecoveryService.RecoveryReport report = recovery.recover();

        assertTrue(queuedIds(indexer).isEmpty(), "work that survived the crash must not be re-run");
        verify(documents).updateDocumentStatus(4L, "indexed");
        assertEquals(1, report.reconciled());
        assertEquals(0, report.requeued());
    }

    @Test
    @DisplayName("a stale document in indexing with nothing on disk is requeued")
    void indexingMissingFromVaultIsRequeued(@TempDir Path vault) {
        Document stale = doc(5L, "indexing", LocalDateTime.now().minusHours(2));
        when(documents.getDocumentsByStatus("indexing")).thenReturn(List.of(stale));
        when(database.findLive(5L, VaultArea.INDEXING)).thenReturn(
                DocumentCopy.builder().documentId(5L).area(VaultArea.INDEXING)
                        .path(vault.resolve("gone.md").toString()).build());

        recovery.recover();

        assertEquals(List.of(5L), queuedIds(indexer));
        verify(documents, never()).updateDocumentStatus(anyLong(), eq("indexed"));
    }

    @Test
    @DisplayName("a document that never started is requeued to the entry stage")
    void newDocumentGoesToTheEntryStage() {
        Document created = doc(6L, "New", LocalDateTime.now());
        when(documents.getDocumentsByStatus("New")).thenReturn(List.of(created));

        RecoveryService.RecoveryReport report = recovery.recover();

        assertEquals(List.of(6L), queuedIds(ingestor));
        assertEquals(1, report.byStage().get("New"));
    }

    @Test
    @DisplayName("one document id is never enqueued twice in a single pass")
    void oneIdIsEnqueuedOnce() {
        Document stale = doc(7L, "ingesting", LocalDateTime.now().minusHours(4));
        // The same row coming back under two statuses is the case the guard is for.
        when(documents.getDocumentsByStatus("ingesting")).thenReturn(List.of(stale, stale));
        when(documents.getDocumentsByStatus("New")).thenReturn(List.of(stale));

        RecoveryService.RecoveryReport report = recovery.recover();

        assertEquals(List.of(7L), queuedIds(ingestor));
        assertEquals(1, report.requeued());
    }

    @Test
    @DisplayName("the report names the count and the stage it came from")
    void reportReadsAsARecoveryReport() {
        when(documents.getDocumentsByStatus("ingesting")).thenReturn(List.of(
                doc(10L, "ingesting", LocalDateTime.now().minusHours(2)),
                doc(11L, "ingesting", LocalDateTime.now().minusHours(2)),
                doc(12L, "ingesting", LocalDateTime.now().minusHours(2))));
        when(documents.getDocumentsByStatus("classifying")).thenReturn(List.of(
                doc(13L, "classifying", LocalDateTime.now().minusHours(2))));

        String summary = recovery.recover().summary();

        assertEquals("Recovered 4 document(s): 3 from ingesting, 1 from classifying", summary);
    }

    @Test
    @DisplayName("a clean startup says so")
    void nothingToRecover() {
        assertEquals("Crash recovery: nothing to recover", recovery.recover().summary());
    }
}
