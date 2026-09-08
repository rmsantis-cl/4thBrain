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
import java.nio.file.InvalidPathException;
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

        // The extension comes from the uploaded name, which is the only clue that
        // survives a browser sending application/octet-stream. Deriving it from the
        // MIME type instead dropped it entirely on every such upload, so the file
        // landed on disk as "notes" rather than "notes.txt" and Ingestor could match
        // neither its type nor its extension.
        String baseName = originalName;
        String extension = "";
        int dotIndex = originalName.lastIndexOf('.');
        if (dotIndex > 0) {
            baseName = originalName.substring(0, dotIndex);
            // A trailing dot is not an extension.
            if (dotIndex < originalName.length() - 1) {
                extension = originalName.substring(dotIndex).toLowerCase();
            }
        }

        String mimeType = resolveMimeType(file.getContentType(), extension, originalName);

        // A name with no extension can still take one from a type we trust.
        if (StringUtils.isBlank(extension)) {
            extension = getExtensionFromMimeType(mimeType);
        }

        log.debug("MIME resolution: name={} declared={} extension={} resolved={}",
            originalName, file.getContentType(), extension, mimeType);

        // Generate unique filename
        String fileName = newName(tmp, baseName);
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

    /**
     * The MIME type to record for an upload.
     * <p>
     * Order matters. A browser that names a real type is believed first, because it
     * may know something the extension cannot say. When it says nothing useful — which
     * for a plain multipart upload is most of the time — the extension decides, and a
     * filesystem probe is the last hint before giving up.
     */
    static String resolveMimeType(String declaredType, String extension, String originalName) {
        String declared = bareType(declaredType);
        if (!isGenericType(declared)) {
            return declared;
        }

        String fromExtension = getMimeTypeFromExtension(extension);
        if (StringUtils.isNotBlank(fromExtension)) {
            return fromExtension;
        }

        try {
            String probed = bareType(Files.probeContentType(Paths.get(originalName)));
            if (!isGenericType(probed)) {
                return probed;
            }
        } catch (IOException | InvalidPathException e) {
            // probeContentType consults the OS registry and can reject an odd name
            // outright on Windows. It is a hint, so a failure falls through.
            log.debug("Could not probe content type for {}: {}", originalName, e.toString());
        }

        return "application/octet-stream";
    }

    /** A content type without its parameters: "text/plain; charset=utf-8" becomes "text/plain". */
    private static String bareType(String mimeType) {
        if (StringUtils.isBlank(mimeType)) {
            return "";
        }
        String type = mimeType.trim();
        int semicolon = type.indexOf(';');
        if (semicolon >= 0) {
            type = type.substring(0, semicolon).trim();
        }
        return type.toLowerCase();
    }

    /** True for the types that carry no information — a client saying "I don't know". */
    private static boolean isGenericType(String bareType) {
        return StringUtils.isBlank(bareType)
            || bareType.equals("application/octet-stream")
            || bareType.equals("binary/octet-stream")
            || bareType.equals("application/unknown")
            || bareType.equals("*/*");
    }

    /**
     * Extension to MIME type. The inverse of {@link #getExtensionFromMimeType(String)},
     * and deliberately wider: it covers the formats ADR28's converter accepts and the
     * archives Ingestor routes to the Extractor, so a document's next stage can be
     * chosen from a file that arrived as octet-stream.
     */
    static String getMimeTypeFromExtension(String extension) {
        if (StringUtils.isBlank(extension)) {
            return "";
        }
        return switch (extension.toLowerCase()) {
            case ".txt", ".log" -> "text/plain";
            case ".md", ".markdown" -> "text/markdown";
            case ".html", ".htm" -> "text/html";
            case ".csv" -> "text/csv";
            case ".json" -> "application/json";
            case ".xml" -> "application/xml";
            case ".pdf" -> "application/pdf";
            case ".doc" -> "application/msword";
            case ".docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case ".xls" -> "application/vnd.ms-excel";
            case ".xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            case ".ppt" -> "application/vnd.ms-powerpoint";
            case ".pptx" -> "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            case ".epub" -> "application/epub+zip";
            case ".rtf" -> "application/rtf";
            case ".odt" -> "application/vnd.oasis.opendocument.text";
            case ".jpg", ".jpeg" -> "image/jpeg";
            case ".png" -> "image/png";
            case ".gif" -> "image/gif";
            case ".webp" -> "image/webp";
            case ".svg" -> "image/svg+xml";
            case ".zip" -> "application/zip";
            case ".gz" -> "application/gzip";
            case ".rar" -> "application/x-rar-compressed";
            case ".7z" -> "application/x-7z-compressed";
            default -> "";
        };
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
