package com.fourthbrain.actuators;

import com.fourthbrain.messaging.Message;
import com.fourthbrain.persistence.DatabaseService;
import com.fourthbrain.persistence.entity.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

/**
 * Story P1.11 — Coordinator entry point (ADR26).
 *
 * Plain-object unit tests, deliberately not a @SpringBootTest, and deliberately
 * not exercising a real Ingestor: every Actuator subclass keeps a static queue
 * shared by every instance of that class in the JVM (P1.9's horizontal-scaling
 * design), so a real Ingestor built here would share its queue with any live
 * Ingestor thread another @SpringBootTest context happens to have running in the
 * same test JVM — whichever one calls take() first wins the race, and a test
 * asserting the loser's side hangs. A mocked Actuator, inserted straight into the
 * registry, sidesteps the static queue entirely.
 */
@DisplayName("Coordinator Tests")
class CoordinatorTest {

    private Coordinator coordinator;
    private DatabaseService databaseService;
    private Actuator ingestor;

    @BeforeEach
    void setUp() {
        coordinator = new Coordinator();
        databaseService = mock(DatabaseService.class);
        ReflectionTestUtils.setField(coordinator, "databaseService", databaseService);

        ingestor = mock(Actuator.class);
        when(ingestor.getName()).thenReturn("Ingestor-0");
        when(ingestor.getGerund()).thenReturn("ingesting");
        registerDirectly("Ingestor", ingestor);
    }

    /** Bypasses register()'s class-name keying so a mock can stand in for "Ingestor". */
    private void registerDirectly(String name, Actuator a) {
        @SuppressWarnings("unchecked")
        Map<String, List<Actuator>> registry =
                (Map<String, List<Actuator>>) ReflectionTestUtils.getField(coordinator, "registry");
        registry.put(name, List.of(a));
    }

    @Test
    @DisplayName("startChain sets status to the first stage and enqueues the loaded Document to Ingestor")
    void startChainQueuesToIngestor() {
        Document doc = Document.builder().id(5L).status("New").build();
        when(databaseService.getDocument(5L)).thenReturn(doc);

        coordinator.startChain(5L);

        verify(databaseService).updateDocumentStatus(5L, "ingesting");
        verify(ingestor).enqueueMessage(argThat(m ->
                m.getDocument() == doc && m.getTo() == ingestor && m.getFrom() == null));
    }

    @Test
    @DisplayName("startChain fails clearly on an unknown document id")
    void startChainRejectsUnknownId() {
        when(databaseService.getDocument(999_999L)).thenReturn(null);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> coordinator.startChain(999_999L));
        assertTrue(ex.getMessage().contains("999999"));
    }

    @Test
    @DisplayName("startChain fails clearly when no Ingestor is registered")
    void startChainRejectsMissingFirstStage() {
        Coordinator empty = new Coordinator();
        ReflectionTestUtils.setField(empty, "databaseService", databaseService);
        Document doc = Document.builder().id(1L).status("New").build();
        when(databaseService.getDocument(1L)).thenReturn(doc);

        assertThrows(IllegalStateException.class, () -> empty.startChain(1L));
    }

    @Test
    @DisplayName("a message built at the REST boundary logs without NPE")
    void externalMessageDoesNotThrow() {
        Document doc = Document.builder().id(1L).status("New").build();

        Message m = Message.to(ingestor, doc);

        assertDoesNotThrow(m::toString);
        assertTrue(m.toString().contains("external"));
    }

    @Test
    @DisplayName("a message between two actuators stamps createdAt")
    void betweenMessageStampsCreatedAt() {
        Actuator extractor = mock(Actuator.class);
        when(extractor.getName()).thenReturn("Extractor-0");
        Document doc = Document.builder().id(1L).status("New").build();

        Message m = Message.between(ingestor, extractor, doc);

        assertNotNull(m.getCreatedAt());
    }
}
