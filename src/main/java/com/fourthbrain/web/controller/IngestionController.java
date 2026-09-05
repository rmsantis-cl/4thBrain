package com.fourthbrain.web.controller;

import com.fourthbrain.messaging.Coordinator;
import com.fourthbrain.persistence.DatabaseService;
import com.fourthbrain.persistence.entity.Document;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.io.IOException;
import java.io.InputStream;
import org.apache.commons.lang3.StringUtils;

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

    private static Document processUploadedFile(MultipartFile file, String vaultTmpPath) throws IOException {
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

        // Create and return Document object with builder
        return Document.builder()
            .path(destPath.toString())
            .name(fileName)
            .extension(extension)
            .mimeType(mimeType)
            .content("")
            .status("New")
            .createdAt(java.time.LocalDateTime.now())
            .updatedAt(java.time.LocalDateTime.now())
            .build();
    }
    @PostMapping("/file")
    public Map<String, Object> uploadFile(@RequestParam("file") MultipartFile file,
                                          @RequestParam(value = "tags", required = false) String tags) throws IOException {
        log.info("[IngestionController] uploadFile: " + file.getOriginalFilename() + ", tags=" + tags);

        // Process the uploaded file and get Document object
        Document doc = processUploadedFile(file, vaultTmpPath);
        log.info("File transferred to: {}", doc.getPath());

        // Save to database
        Document savedDoc = databaseService.create(doc);
        log.info("Saved record on ",saveDoc.getId());
        Long docId = savedDoc.getId();

        // Start pipeline
        coordinator.startChain(docId);

        return Map.of(
            "message", "File received and queued",
            "jobId", docId,
            "fileName", doc.getName(),
            "mimeType", doc.getMimeType()
        );
    }

    private String getExtensionFromMimeType(String mimeType) {
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

    @PostMapping("/text")
    public Map<String, Object> submitText(@RequestBody Map<String, String> payload) {
        String text = payload.get("text");
        String tags = payload.get("tags");
        System.out.println("[IngestionController] submitText: text length=" + (text != null ? text.length() : 0) + ", tags=" + tags);

        // Create document in database
        Long docId = databaseService.createDocument("text", text).getId();

        // Start pipeline
        coordinator.startChain(docId);

        return Map.of(
            "message", "Text received and queued",
            "jobId", docId
        );
    }

    @PostMapping("/url")
    public Map<String, Object> submitUrl(@RequestBody Map<String, String> payload) {
        String url = payload.get("url");
        String tags = payload.get("tags");
        System.out.println("[IngestionController] submitUrl: " + url + ", tags=" + tags);

        // Create document in database
        Long docId = databaseService.createDocument(url, "(URL: " + url + ")").getId();

        // Start pipeline
        coordinator.startChain(docId);

        return Map.of(
            "message", "URL received and queued",
            "jobId", docId
        );
    }
}
