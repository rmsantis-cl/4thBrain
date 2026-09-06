package com.fourthbrain.web.controller;

import com.fourthbrain.actuators.Coordinator;
import com.fourthbrain.persistence.DatabaseService;
import com.fourthbrain.persistence.entity.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;

// import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(IngestionController.class)
@DisplayName("IngestionController Tests")
public class IngestionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DatabaseService databaseService;

    @MockBean
    private Coordinator coordinator;

    private Document testDocument;
    private static final String VAULT_TMP_PATH = "/tmp/vault";

    @BeforeEach
    void setUp() {
        testDocument = Document.builder()
                .id(1L)
                .path("/tmp/vault/test-doc")
                .name("test-doc.txt")
                .extension(".txt")
                .mimeType("text/plain")
                .content("Test content")
                .status("New")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    // ========== POST /api/ingest/text Tests ==========

    @Test
    @DisplayName("Should accept long text submission and return 200 with jobId")
    void testSubmitLongText() throws Exception {
        // Arrange
        String longText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(50);
        when(databaseService.createDocument(anyString(), anyString())).thenReturn(testDocument);

        // Act & Assert
        MvcResult result = mockMvc.perform(post("/api/ingest/text")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"text\":\"" + longText.replace("\"", "\\\"") + "\",\"tags\":\"test\"}")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Text received and queued"))
                .andExpect(jsonPath("$.jobId").value(1))
                .andReturn();

        // Verify interactions
        verify(databaseService, times(1)).createDocument(anyString(), anyString());
        verify(coordinator, times(1)).startChain(1L);
    }

    @Test
    @DisplayName("Should accept short text submission and return 200 with jobId")
    void testSubmitShortText() throws Exception {
        // Arrange
        String shortText = "Short test text";
        when(databaseService.createDocument(anyString(), anyString())).thenReturn(testDocument);

        // Act & Assert
        mockMvc.perform(post("/api/ingest/text")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"text\":\"" + shortText + "\",\"tags\":\"test\"}")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Text received and queued"))
                .andExpect(jsonPath("$.jobId").value(1))
                .andReturn();

        // Verify interactions
        verify(databaseService, times(1)).createDocument(anyString(), anyString());
        verify(coordinator, times(1)).startChain(1L);
    }

    @Test
    @DisplayName("Should handle text submission without tags")
    void testSubmitTextWithoutTags() throws Exception {
        // Arrange
        String text = "Text without tags";
        when(databaseService.createDocument(anyString(), anyString())).thenReturn(testDocument);

        // Act & Assert
        mockMvc.perform(post("/api/ingest/text")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"text\":\"" + text + "\"}")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobId").value(1));

        verify(databaseService, times(1)).createDocument(anyString(), anyString());
        verify(coordinator, times(1)).startChain(1L);
    }

    @Test
    @DisplayName("Should handle empty text submission gracefully")
    void testSubmitEmptyText() throws Exception {
        // Arrange
        when(databaseService.createDocument(anyString(), anyString())).thenReturn(testDocument);

        // Act & Assert
        mockMvc.perform(post("/api/ingest/text")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"text\":\"\",\"tags\":\"test\"}")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobId").value(1));

        verify(databaseService, times(1)).createDocument(anyString(), anyString());
        verify(coordinator, times(1)).startChain(1L);
    }

    @Test
    @DisplayName("Should handle null text in payload")
    void testSubmitNullText() throws Exception {
        // Arrange
        when(databaseService.createDocument(anyString(), anyString())).thenReturn(testDocument);

        // Act & Assert
        mockMvc.perform(post("/api/ingest/text")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"tags\":\"test\"}")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobId").value(1));

        verify(databaseService, times(1)).createDocument(anyString(), anyString());
    }

    // ========== POST /api/ingest/url Tests ==========

    @Test
    @DisplayName("Should accept valid URL submission and return 200 with jobId")
    void testSubmitValidUrl() throws Exception {
        // Arrange
        String url = "https://example.com/article";
        when(databaseService.createDocument(anyString(), anyString())).thenReturn(testDocument);

        // Act & Assert
        mockMvc.perform(post("/api/ingest/url")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"url\":\"" + url + "\",\"tags\":\"web\"}")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("URL received and queued"))
                .andExpect(jsonPath("$.jobId").value(1));

        // Verify that URL is passed to the database service
        verify(databaseService, times(1)).createDocument(url, "(URL: " + url + ")");
        verify(coordinator, times(1)).startChain(1L);
    }

    @Test
    @DisplayName("Should accept URL submission without tags")
    void testSubmitUrlWithoutTags() throws Exception {
        // Arrange
        String url = "https://example.com/page";
        when(databaseService.createDocument(anyString(), anyString())).thenReturn(testDocument);

        // Act & Assert
        mockMvc.perform(post("/api/ingest/url")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"url\":\"" + url + "\"}")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobId").value(1));

        verify(databaseService, times(1)).createDocument(url, "(URL: " + url + ")");
    }

    @Test
    @DisplayName("Should handle empty URL submission")
    void testSubmitEmptyUrl() throws Exception {
        // Arrange
        when(databaseService.createDocument(anyString(), anyString())).thenReturn(testDocument);

        // Act & Assert
        mockMvc.perform(post("/api/ingest/url")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"url\":\"\",\"tags\":\"web\"}")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobId").value(1));

        verify(databaseService, times(1)).createDocument(anyString(), anyString());
    }

    @Test
    @DisplayName("Should handle null URL in payload")
    void testSubmitNullUrl() throws Exception {
        // Arrange
        when(databaseService.createDocument(anyString(), anyString())).thenReturn(testDocument);

        // Act & Assert
        mockMvc.perform(post("/api/ingest/url")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"tags\":\"web\"}")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobId").value(1));

        verify(databaseService, times(1)).createDocument(anyString(), anyString());
    }

    @Test
    @DisplayName("Should accept malformed URL gracefully")
    void testSubmitMalformedUrl() throws Exception {
        // Arrange
        String malformedUrl = "not a valid url at all";
        when(databaseService.createDocument(anyString(), anyString())).thenReturn(testDocument);

        // Act & Assert
        mockMvc.perform(post("/api/ingest/url")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"url\":\"" + malformedUrl + "\",\"tags\":\"web\"}")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobId").value(1));

        verify(databaseService, times(1)).createDocument(malformedUrl, "(URL: " + malformedUrl + ")");
    }

    // ========== POST /api/ingest/file Tests ==========

    @Test
    @DisplayName("Should accept text file submission and return 200 with jobId")
    void testSubmitTextFile() throws Exception {
        // Arrange
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test-document.txt",
                "text/plain",
                "This is test file content".getBytes()
        );
        when(databaseService.create(any(Document.class))).thenReturn(testDocument);

        // Act & Assert
        mockMvc.perform(multipart("/api/ingest/file")
                .file(file)
                .param("tags", "document")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("File received and queued"))
                .andExpect(jsonPath("$.jobId").value(1))
                .andExpect(jsonPath("$.fileName").value("test-document.txt"))
                .andExpect(jsonPath("$.mimeType").value("text/plain"));

        // Verify interactions
        verify(databaseService, times(1)).create(any(Document.class));
        verify(coordinator, times(1)).startChain(1L);
    }

    @Test
    @DisplayName("Should accept PDF file submission")
    void testSubmitPdfFile() throws Exception {
        // Arrange
        byte[] pdfContent = new byte[]{0x25, 0x50, 0x44, 0x46}; // PDF header
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "document.pdf",
                "application/pdf",
                pdfContent
        );
        when(databaseService.create(any(Document.class))).thenReturn(testDocument);

        // Act & Assert
        mockMvc.perform(multipart("/api/ingest/file")
                .file(file)
                .param("tags", "report")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("File received and queued"))
                .andExpect(jsonPath("$.jobId").value(1))
                .andExpect(jsonPath("$.fileName").value("document.pdf"))
                .andExpect(jsonPath("$.mimeType").value("application/pdf"));

        verify(databaseService, times(1)).create(any(Document.class));
        verify(coordinator, times(1)).startChain(1L);
    }

    @Test
    @DisplayName("Should accept compressed ZIP file submission")
    void testSubmitCompressedFile() throws Exception {
        // Arrange
        byte[] zipContent = new byte[]{0x50, 0x4B, 0x03, 0x04}; // ZIP header
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "archive.zip",
                "application/zip",
                zipContent
        );
        when(databaseService.create(any(Document.class))).thenReturn(testDocument);

        // Act & Assert
        mockMvc.perform(multipart("/api/ingest/file")
                .file(file)
                .param("tags", "compressed")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("File received and queued"))
                .andExpect(jsonPath("$.jobId").value(1))
                .andExpect(jsonPath("$.fileName").value("archive.zip"))
                .andExpect(jsonPath("$.mimeType").value("application/zip"));

        verify(databaseService, times(1)).create(any(Document.class));
        verify(coordinator, times(1)).startChain(1L);
    }

    @Test
    @DisplayName("Should handle file submission without tags")
    void testSubmitFileWithoutTags() throws Exception {
        // Arrange
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "document.txt",
                "text/plain",
                "Content".getBytes()
        );
        when(databaseService.create(any(Document.class))).thenReturn(testDocument);

        // Act & Assert
        mockMvc.perform(multipart("/api/ingest/file")
                .file(file)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobId").value(1));

        verify(databaseService, times(1)).create(any(Document.class));
        verify(coordinator, times(1)).startChain(1L);
    }

    @Test
    @DisplayName("Should handle file with no extension")
    void testSubmitFileWithNoExtension() throws Exception {
        // Arrange
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "document",
                "application/octet-stream",
                "Binary content".getBytes()
        );
        when(databaseService.create(any(Document.class))).thenReturn(testDocument);

        // Act & Assert
        mockMvc.perform(multipart("/api/ingest/file")
                .file(file)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobId").value(1))
                .andExpect(jsonPath("$.fileName").value("document"));

        verify(databaseService, times(1)).create(any(Document.class));
    }

    @Test
    @DisplayName("Should handle file with blank filename")
    void testSubmitFileWithBlankFilename() throws Exception {
        // Arrange
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "",
                "text/plain",
                "Content".getBytes()
        );
        when(databaseService.create(any(Document.class))).thenReturn(testDocument);

        // Act & Assert
        mockMvc.perform(multipart("/api/ingest/file")
                .file(file)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobId").value(1))
                .andExpect(jsonPath("$.fileName").value("document.txt")); // Defaults to "document" with .txt extension

        verify(databaseService, times(1)).create(any(Document.class));
    }

    @Test
    @DisplayName("Should accept large file submission")
    void testSubmitLargeFile() throws Exception {
        // Arrange - 5MB file
        byte[] largeContent = new byte[5 * 1024 * 1024];
        for (int i = 0; i < largeContent.length; i++) {
            largeContent[i] = (byte) (i % 256);
        }
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "large-document.bin",
                "application/octet-stream",
                largeContent
        );
        when(databaseService.create(any(Document.class))).thenReturn(testDocument);

        // Act & Assert
        mockMvc.perform(multipart("/api/ingest/file")
                .file(file)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobId").value(1));

        verify(databaseService, times(1)).create(any(Document.class));
        verify(coordinator, times(1)).startChain(1L);
    }

    @Test
    @DisplayName("Should handle empty file submission")
    void testSubmitEmptyFile() throws Exception {
        // Arrange
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "empty.txt",
                "text/plain",
                new byte[0]
        );
        when(databaseService.create(any(Document.class))).thenReturn(testDocument);

        // Act & Assert
        mockMvc.perform(multipart("/api/ingest/file")
                .file(file)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobId").value(1));

        verify(databaseService, times(1)).create(any(Document.class));
    }

    @Test
    @DisplayName("Should handle file with special characters in name")
    void testSubmitFileWithSpecialCharacters() throws Exception {
        // Arrange
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "document_2024-09-05 (final).txt",
                "text/plain",
                "Content".getBytes()
        );
        when(databaseService.create(any(Document.class))).thenReturn(testDocument);

        // Act & Assert
        mockMvc.perform(multipart("/api/ingest/file")
                .file(file)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobId").value(1));

        verify(databaseService, times(1)).create(any(Document.class));
    }

    // ========== Integration and Response Tests ==========

    @Test
    @DisplayName("Response should contain all required fields for file upload")
    void testFileUploadResponseStructure() throws Exception {
        // Arrange
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test.txt",
                "text/plain",
                "Test content".getBytes()
        );
        when(databaseService.create(any(Document.class))).thenReturn(testDocument);

        // Act & Assert
        mockMvc.perform(multipart("/api/ingest/file")
                .file(file)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isNotEmpty())
                .andExpect(jsonPath("$.message").exists())
                .andExpect(jsonPath("$.jobId").exists())
                .andExpect(jsonPath("$.fileName").exists())
                .andExpect(jsonPath("$.mimeType").exists());
    }

    @Test
    @DisplayName("Response should contain all required fields for text submission")
    void testTextSubmissionResponseStructure() throws Exception {
        // Arrange
        when(databaseService.createDocument(anyString(), anyString())).thenReturn(testDocument);

        // Act & Assert
        mockMvc.perform(post("/api/ingest/text")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"text\":\"Test text\",\"tags\":\"test\"}")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isNotEmpty())
                .andExpect(jsonPath("$.message").exists())
                .andExpect(jsonPath("$.jobId").exists());
    }

    @Test
    @DisplayName("Response should contain all required fields for URL submission")
    void testUrlSubmissionResponseStructure() throws Exception {
        // Arrange
        when(databaseService.createDocument(anyString(), anyString())).thenReturn(testDocument);

        // Act & Assert
        mockMvc.perform(post("/api/ingest/url")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"url\":\"https://example.com\",\"tags\":\"web\"}")
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isNotEmpty())
                .andExpect(jsonPath("$.message").exists())
                .andExpect(jsonPath("$.jobId").exists());
    }

    @Test
    @DisplayName("Should correctly invoke coordinator for each submission type")
    void testCoordinatorInvocationForAllSubmissionTypes() throws Exception {
        // Arrange
        when(databaseService.createDocument(anyString(), anyString())).thenReturn(testDocument);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test.txt",
                "text/plain",
                "Content".getBytes()
        );
        when(databaseService.create(any(Document.class))).thenReturn(testDocument);

        // Act & Assert - Text
        mockMvc.perform(post("/api/ingest/text")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"text\":\"Test\"}"))
                .andExpect(status().isOk());

        // Act & Assert - URL
        mockMvc.perform(post("/api/ingest/url")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"url\":\"https://example.com\"}"))
                .andExpect(status().isOk());

        // Act & Assert - File
        mockMvc.perform(multipart("/api/ingest/file")
                .file(file))
                .andExpect(status().isOk());

        // Verify coordinator was called 3 times
        verify(coordinator, times(3)).startChain(anyLong());
    }
}
