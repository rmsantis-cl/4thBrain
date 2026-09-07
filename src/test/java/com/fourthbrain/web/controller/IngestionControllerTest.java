package com.fourthbrain.web.controller;

import com.fourthbrain.actuators.Coordinator;
import com.fourthbrain.persistence.DatabaseService;
import com.fourthbrain.persistence.entity.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Story P1.13, rewritten against ADR26: one ingest-by-value endpoint,
 * {@code POST /api/ingest/capture}, dispatching on a {@code url} or
 * {@code text} body key, plus the unchanged {@code /file} endpoint. Response
 * shape is {@code { id, status, message }} on every endpoint (ADR26 decision 7).
 */
@WebMvcTest(IngestionController.class)
@DisplayName("IngestionController Tests")
class IngestionControllerTest {

    @Autowired
    private org.springframework.test.web.servlet.MockMvc mockMvc;

    @MockitoBean
    private DatabaseService databaseService;

    @MockitoBean
    private Coordinator coordinator;

    private Document testDocument;

    @BeforeEach
    void setUp() {
        testDocument = Document.builder()
                .id(1L)
                .name("test-doc.txt")
                .extension(".txt")
                .mimeType("text/plain")
                .content("Test content")
                .status("New")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    // ========== POST /api/ingest/capture — text ==========

    @Test
    @DisplayName("A text body creates a Document, starts the chain, returns the agreed shape")
    void captureText() throws Exception {
        when(databaseService.create(any(Document.class))).thenReturn(testDocument);

        mockMvc.perform(post("/api/ingest/capture")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"text\":\"Some captured note\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.status").value("ingesting"))
                .andExpect(jsonPath("$.message").value("Text received and queued"));

        verify(databaseService, times(1)).create(argThat(d ->
                "Some captured note".equals(d.getContent()) && d.getSourceUrl() == null));
        verify(coordinator, times(1)).startChain(1L);
    }

    // ========== POST /api/ingest/capture — url ==========

    @Test
    @DisplayName("A url body creates a Document with source_url set and no content, starts the chain")
    void captureUrl() throws Exception {
        when(databaseService.create(any(Document.class))).thenReturn(testDocument);

        mockMvc.perform(post("/api/ingest/capture")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"url\":\"https://example.com/article\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.status").value("ingesting"))
                .andExpect(jsonPath("$.message").value("URL received and queued"));

        verify(databaseService, times(1)).create(argThat(d ->
                "https://example.com/article".equals(d.getSourceUrl())
                        && (d.getContent() == null || d.getContent().isEmpty())));
        verify(coordinator, times(1)).startChain(1L);
    }

    // ========== Rejection: neither or both keys present ==========

    @Test
    @DisplayName("A body with neither url nor text is rejected, not guessed at")
    void captureRejectsEmptyBody() throws Exception {
        mockMvc.perform(post("/api/ingest/capture")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(databaseService, coordinator);
    }

    @Test
    @DisplayName("A body with both url and text is rejected, not guessed at")
    void captureRejectsBothKeys() throws Exception {
        mockMvc.perform(post("/api/ingest/capture")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"url\":\"https://example.com\",\"text\":\"note\"}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(databaseService, coordinator);
    }

    @Test
    @DisplayName("Blank url and blank text both count as absent")
    void captureRejectsBlankValues() throws Exception {
        mockMvc.perform(post("/api/ingest/capture")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"url\":\"   \",\"text\":\"\"}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(databaseService, coordinator);
    }

    // ========== The retired endpoints ==========

    @Test
    @DisplayName("/api/ingest/text no longer exists")
    void textEndpointGone() throws Exception {
        mockMvc.perform(post("/api/ingest/text")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"text\":\"x\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("/api/ingest/url no longer exists")
    void urlEndpointGone() throws Exception {
        mockMvc.perform(post("/api/ingest/url")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"url\":\"https://example.com\"}"))
                .andExpect(status().isNotFound());
    }

    // ========== POST /api/ingest/file ==========

    @Test
    @DisplayName("A file upload creates a Document, starts the chain, returns the agreed shape")
    void uploadFile() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test-document.txt", "text/plain", "This is test file content".getBytes());
        when(databaseService.create(any(Document.class))).thenReturn(testDocument);

        mockMvc.perform(multipart("/api/ingest/file").file(file).param("tags", "document"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.status").value("ingesting"))
                .andExpect(jsonPath("$.message").value("File received and queued"))
                .andExpect(jsonPath("$.fileName").value("test-document.txt"))
                .andExpect(jsonPath("$.mimeType").value("text/plain"));

        verify(databaseService, times(1)).create(any(Document.class));
        verify(coordinator, times(1)).startChain(1L);
    }

    @Test
    @DisplayName("Response shape is consistent across file, text and url ingestion")
    void responseShapeIsConsistentAcrossEndpoints() throws Exception {
        when(databaseService.create(any(Document.class))).thenReturn(testDocument);
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.txt", "text/plain", "Content".getBytes());

        mockMvc.perform(multipart("/api/ingest/file").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.status").exists())
                .andExpect(jsonPath("$.message").exists());

        mockMvc.perform(post("/api/ingest/capture")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"text\":\"Test text\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.status").exists())
                .andExpect(jsonPath("$.message").exists());

        mockMvc.perform(post("/api/ingest/capture")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"url\":\"https://example.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.status").exists())
                .andExpect(jsonPath("$.message").exists());

        verify(coordinator, times(3)).startChain(anyLong());
    }
}
