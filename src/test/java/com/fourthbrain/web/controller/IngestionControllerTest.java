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

// Named one by one rather than by wildcard: org.hamcrest.Matchers and
// org.mockito.ArgumentMatchers both declare any(), startsWith() and endsWith(),
// and a wildcard import of both makes every one of those ambiguous. A single
// static import outranks a static-import-on-demand, so these win where they clash.
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.endsWith;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.startsWith;
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

    // ========== MIME type resolution ==========
    //
    // A browser posting a plain multipart upload usually declares
    // application/octet-stream. That is not blank, so the old code accepted it,
    // derived the extension *from* it, and got nothing back — the file lost its
    // extension on disk and on the Document, and Ingestor could then match neither
    // its mime type nor its extension, so the chain stopped at "ingested".

    @Test
    @DisplayName("octet-stream falls back to the extension, and the extension survives")
    void octetStreamResolvesFromExtension() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "meeting-notes.txt", "application/octet-stream", "notes".getBytes());
        when(databaseService.create(any(Document.class))).thenReturn(testDocument);

        mockMvc.perform(multipart("/api/ingest/file").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fileName").value("meeting-notes.txt"))
                .andExpect(jsonPath("$.mimeType").value("text/plain"));

        verify(databaseService).create(argThat(d ->
                "text/plain".equals(d.getMimeType()) && ".txt".equals(d.getExtension())));
    }

    @Test
    @DisplayName("octet-stream on a .pdf resolves to application/pdf")
    void octetStreamResolvesPdf() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "paper.pdf", "application/octet-stream", "%PDF-1.4".getBytes());
        when(databaseService.create(any(Document.class))).thenReturn(testDocument);

        mockMvc.perform(multipart("/api/ingest/file").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mimeType").value("application/pdf"));

        verify(databaseService).create(argThat(d -> ".pdf".equals(d.getExtension())));
    }

    @Test
    @DisplayName("An extension is matched case-insensitively and stored lowercase")
    void extensionIsCaseInsensitive() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "SCAN.PDF", "application/octet-stream", "%PDF-1.4".getBytes());
        when(databaseService.create(any(Document.class))).thenReturn(testDocument);

        mockMvc.perform(multipart("/api/ingest/file").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fileName").value("SCAN.pdf"))
                .andExpect(jsonPath("$.mimeType").value("application/pdf"));
    }

    @Test
    @DisplayName("A declared type that is not generic is believed over the extension")
    void declaredTypeWinsWhenSpecific() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "export.csv", "application/vnd.ms-excel", "a,b".getBytes());
        when(databaseService.create(any(Document.class))).thenReturn(testDocument);

        mockMvc.perform(multipart("/api/ingest/file").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mimeType").value("application/vnd.ms-excel"))
                .andExpect(jsonPath("$.fileName").value("export.csv"));
    }

    @Test
    @DisplayName("Charset parameters are stripped from a declared type")
    void charsetParameterIsStripped() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "readme.md", "text/markdown; charset=UTF-8", "# hi".getBytes());
        when(databaseService.create(any(Document.class))).thenReturn(testDocument);

        mockMvc.perform(multipart("/api/ingest/file").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mimeType").value("text/markdown"));
    }

    @Test
    @DisplayName("An unknown extension keeps the extension and stays octet-stream")
    void unknownExtensionKeepsItsSuffix() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "archive.qqq", "application/octet-stream", "x".getBytes());
        when(databaseService.create(any(Document.class))).thenReturn(testDocument);

        // The name is asserted by suffix, not exactly: newName() de-duplicates against
        // whatever is already in the tmp directory, so an exact match would depend on
        // the machine's leftovers rather than on the code under test.
        mockMvc.perform(multipart("/api/ingest/file").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fileName").value(endsWith(".qqq")))
                .andExpect(jsonPath("$.mimeType").value("application/octet-stream"));

        verify(databaseService).create(argThat(d -> ".qqq".equals(d.getExtension())));
    }

    @Test
    @DisplayName("A name with no extension and no usable type is left as octet-stream")
    void noExtensionNoType() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "LICENSE", "application/octet-stream", "x".getBytes());
        when(databaseService.create(any(Document.class))).thenReturn(testDocument);

        mockMvc.perform(multipart("/api/ingest/file").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fileName").value(startsWith("LICENSE")))
                .andExpect(jsonPath("$.fileName").value(not(containsString("."))))
                .andExpect(jsonPath("$.mimeType").value("application/octet-stream"));
    }

    @Test
    @DisplayName("A zip arrives typed so Ingestor can route it to the Extractor")
    void zipIsTypedForRouting() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "bundle.zip", "application/octet-stream", "PK".getBytes());
        when(databaseService.create(any(Document.class))).thenReturn(testDocument);

        mockMvc.perform(multipart("/api/ingest/file").file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mimeType").value("application/zip"));
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
