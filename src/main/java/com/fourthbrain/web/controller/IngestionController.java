package com.fourthbrain.web.controller;

import com.fourthbrain.actuators.Coordinator;
import com.fourthbrain.persistence.DatabaseService;
import com.fourthbrain.persistence.VaultArea;
import com.fourthbrain.persistence.entity.Document;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.io.IOException;

@Slf4j
@RestController
@RequestMapping("/api/ingest")
public class IngestionController {

    @Autowired
    private Coordinator coordinator;

    @Autowired
    private DatabaseService databaseService;

    @Value("${vault.tmp}")
    private String vaultTmpPath;

    @Value("${vault.default.name:file}")
    private String incomingName;


    public static String newName(Path path, String prefix) {
        if (path == null || prefix == null) {
            throw new IllegalArgumentException("path and prefix cannot be null");
        }

        Path candidate = path.resolve(prefix);
        if (!Files.exists(candidate)) {
            return prefix;
        }

        int counter = 1;
        while (true) {
            String uniqueName = String.format("%s_%03d", prefix, counter);
            candidate = path.resolve(uniqueName);
            if (!Files.exists(candidate)) {
                return uniqueName;
            }
            counter++;
        }
    }

    /** An uploaded file: the document record, and where the bytes landed. */
    private record Upload(Document document, Path destPath) {
    }

    private static Upload processUploadedFile(MultipartFile file, String vaultTmpPath) throws IOException {
        Path tmp = Paths.get(vaultTmpPath);
        if (!Files.exists(tmp)) {
            Files.createDirectories(tmp);
        }

        // Extract and validate filename
        String originalName = file.getOriginalFilename();
        if (StringUtils.isBlank(originalName)) {
            originalName = "document";
        }

        // Extract base name without extension
        String baseName = originalName;
        int dotIndex = originalName.lastIndexOf('.');
        if (dotIndex > 0) {
            baseName = originalName.substring(0, dotIndex);
        }

        // Generate unique filename
        String fileName = newName(tmp, baseName);

        // Detect MIME type
        String mimeType = file.getContentType();
        if (StringUtils.isBlank(mimeType)) {
            mimeType = Files.probeContentType(Paths.get(originalName));
        }
        if (StringUtils.isBlank(mimeType)) {
            mimeType = "application/octet-stream";
        }

        // Get file extension from MIME type
        String extension = getExtensionFromMimeType(mimeType);
        if (StringUtils.isNotBlank(extension)) {
            fileName = fileName + extension;
        }

        // Transfer file to tmp directory
        Path destPath = tmp.resolve(fileName);
        Files.copy(file.getInputStream(), destPath, StandardCopyOption.REPLACE_EXISTING);

        // Create and return Document object with builder. Its location is
        // recorded as a document_copy once the record has an id (P1.8).
        Document doc = Document.builder()
            .name(fileName)
            .extension(extension)
            .mimeType(mimeType)
            .content("")
            .status("New")
            .createdAt(java.time.LocalDateTime.now())
            .updatedAt(java.time.LocalDateTime.now())
            .build();

        return new Upload(doc, destPath);
    }
    @PostMapping("/file")
    public Map<String, Object> uploadFile(@RequestParam("file") MultipartFile file,
                                          @RequestParam(value = "tags", required = false) String tags) throws IOException {
        log.info("[IngestionController] uploadFile: " + file.getOriginalFilename() + ", tags=" + tags);

        // Process the uploaded file and get Document object
        Upload upload = processUploadedFile(file, vaultTmpPath);
        Document doc = upload.document();
        log.info("File transferred to: {}", upload.destPath());

        // Save to database, then record where the file landed
        Document savedDoc = databaseService.create(doc);
        databaseService.addCopy(savedDoc, VaultArea.TMP, upload.destPath().toString());
        log.info("Saved record on {}", savedDoc.id());

        // Start pipeline
        coordinator.startChain(savedDoc.id());

        return Map.of(
            "id", savedDoc.id(),
            "status", "ingesting",
            "message", "File received and queued",
            "fileName", doc.getName(),
            "mimeType", doc.getMimeType()
        );
    }

    private static String getExtensionFromMimeType(String mimeType) {
        if (StringUtils.isBlank(mimeType)) {
            return "";
        }
        return switch (mimeType) {
            case "application/pdf" -> ".pdf";
            case "text/plain" -> ".txt";
            case "text/html" -> ".html";
            case "text/markdown" -> ".md";
            case "application/json" -> ".json";
            case "application/msword" -> ".doc";
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document" -> ".docx";
            case "application/vnd.ms-excel" -> ".xls";
            case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" -> ".xlsx";
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/gif" -> ".gif";
            default -> "";
        };
    }

    /**
     * Ingest by value: a body carries either a "url" or a "text" key, never both
     * (ADR26 decision 6). The UI's own type-detection picks the key; this handler
     * does not re-derive the type. Replaces the former /text and /url endpoints.
     */
    @PostMapping("/capture")
    public Map<String, Object> capture(@RequestBody Map<String, String> payload) {
        String url = StringUtils.trimToNull(payload.get("url"));
        String text = StringUtils.trimToNull(payload.get("text"));

        if ((url == null) == (text == null)) {
            throw new IllegalArgumentException("Request body must set exactly one of 'url' or 'text'");
        }

        Document doc = (url != null) ? buildUrlDocument(url) : buildTextDocument(text);
        Document savedDoc = databaseService.create(doc);
        log.info("Captured document: id={}, sourceUrl={}", savedDoc.getId(), savedDoc.getSourceUrl());

        coordinator.startChain(savedDoc.getId());

        return Map.of(
            "id", savedDoc.getId(),
            "status", "ingesting",
            "message", url != null ? "URL received and queued" : "Text received and queued"
        );
    }

    /** No copy row: the URL is provenance, not a location, so it lives in source_url (P1.8, ADR26). */
    private static Document buildUrlDocument(String url) {
        return Document.builder()
            .sourceUrl(url)
            .content("")
            .status("New")
            .createdAt(java.time.LocalDateTime.now())
            .updatedAt(java.time.LocalDateTime.now())
            .build();
    }

    /** No copy row: nothing is on disk. */
    private static Document buildTextDocument(String text) {
        return Document.builder()
            .content(text)
            .mimeType("text/plain")
            .status("New")
            .createdAt(java.time.LocalDateTime.now())
            .updatedAt(java.time.LocalDateTime.now())
            .build();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, Object> handleBadCapture(IllegalArgumentException e) {
        return Map.of("message", e.getMessage());
    }
}
