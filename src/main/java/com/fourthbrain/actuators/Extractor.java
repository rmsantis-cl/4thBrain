package com.fourthbrain.actuators;

import com.fourthbrain.messaging.Message;
import com.fourthbrain.persistence.DatabaseService;
import com.fourthbrain.persistence.entity.Document;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Component
@Slf4j
public class Extractor extends Actuator {

    private static final Queue<Message> extractorQueue = new ConcurrentLinkedQueue<>();

    @Value("${vault.tmp}")
    private String vaultTmpPath;

    @Autowired
    private DatabaseService databaseService;

    @Autowired
    private Ingestor ingestor;

    public Extractor() {
        super();
        log.info("Extractor initialized");
    }

    @Override
    protected Queue<Message> getQueue() {
        return extractorQueue;
    }

    @Override
    public String getGerund() {
        return "extracting";
    }

    @Override
    public String getParticiple() {
        return "extracted";
    }

    @Override
    public String doTheThing(Document doc) {
        if (doc == null) {
            log.warn("Received null document");
            return null;
        }

        log.info("Extracting document: id={}, path={}, mimeType={}",
            doc.getId(), doc.getPath(), doc.getMimeType());

        try {
            // Check if the document is a ZIP file
            if (!isZipFile(doc)) {
                log.debug("Document is not a ZIP file: id={}", doc.getId());
                return null;
            }

            // Extract the ZIP file
            extractZipAndCreateDocuments(doc);

            // Return null - extraction is complete
            return null;
        } catch (Exception e) {
            log.error("Error extracting document: id={}", doc.getId(), e);
            return null;
        }
    }

    private boolean isZipFile(Document doc) {
        if (doc.getMimeType() != null) {
            return doc.getMimeType().equals("application/zip") ||
                   doc.getMimeType().equals("application/x-zip-compressed");
        }

        if (doc.getExtension() != null) {
            return doc.getExtension().equalsIgnoreCase(".zip");
        }

        return false;
    }

    private void extractZipAndCreateDocuments(Document zipDoc) throws IOException {
        Path zipPath = Paths.get(zipDoc.getPath());

        if (!Files.exists(zipPath)) {
            log.warn("ZIP file does not exist: {}", zipPath);
            return;
        }

        // Create extraction directory
        Path extractionDir = Paths.get(vaultTmpPath).resolve("extracted_" + System.currentTimeMillis());
        Files.createDirectories(extractionDir);

        try (ZipInputStream zipInput = new ZipInputStream(Files.newInputStream(zipPath))) {
            ZipEntry entry;
            while ((entry = zipInput.getNextEntry()) != null) {
                if (entry.isDirectory()) {
                    continue; // Skip directories
                }

                // Extract file to disk
                Path extractedFilePath = extractionDir.resolve(entry.getName());
                Files.createDirectories(extractedFilePath.getParent());
                Files.copy(zipInput, extractedFilePath);

                log.debug("Extracted file: {}", extractedFilePath);

                // Create a Document for the extracted file
                Document extractedDoc = createDocumentForExtractedFile(
                    zipDoc, extractedFilePath, entry.getName());

                // Save to database
                Document savedDoc = databaseService.create(extractedDoc);
                log.info("Extracted document created: id={}, parentId={}, name={}",
                    savedDoc.getId(), savedDoc.getParentId(), savedDoc.getName());

                // Send to Ingestor for processing
                sendToIngestor(savedDoc);
            }
        }

        log.info("ZIP extraction complete: parentId={}, extractionDir={}",
            zipDoc.getId(), extractionDir);
    }

    private Document createDocumentForExtractedFile(Document zipDoc, Path filePath, String entryName) {
        String fileName = filePath.getFileName().toString();
        String extension = getFileExtension(fileName);
        String mimeType = guessMimeType(extension, fileName);

        return Document.builder()
            .parentId(zipDoc.getId())
            .path(filePath.toString())
            .name(fileName)
            .extension(extension)
            .mimeType(mimeType)
            .content("")
            .status("New")
            .createdAt(LocalDateTime.now())
            .updatedAt(LocalDateTime.now())
            .build();
    }

    private String getFileExtension(String fileName) {
        int lastDot = fileName.lastIndexOf('.');
        if (lastDot > 0 && lastDot < fileName.length() - 1) {
            return fileName.substring(lastDot);
        }
        return "";
    }

    private String guessMimeType(String extension, String fileName) {
        if (extension.isEmpty()) {
            return "application/octet-stream";
        }

        return switch (extension.toLowerCase()) {
            case ".pdf" -> "application/pdf";
            case ".txt" -> "text/plain";
            case ".html", ".htm" -> "text/html";
            case ".md" -> "text/markdown";
            case ".json" -> "application/json";
            case ".xml" -> "application/xml";
            case ".csv" -> "text/csv";
            case ".doc" -> "application/msword";
            case ".docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case ".xls" -> "application/vnd.ms-excel";
            case ".xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            case ".jpg", ".jpeg" -> "image/jpeg";
            case ".png" -> "image/png";
            case ".gif" -> "image/gif";
            case ".zip" -> "application/zip";
            default -> "application/octet-stream";
        };
    }

    private void sendToIngestor(Document doc) {
        if (ingestor == null) {
            log.warn("Ingestor actuator not available - cannot send document: id={}", doc.getId());
            return;
        }

        try {
            // Create a message and send to Ingestor
            Message message = Message.builder()
                .document(doc)
                .from(this)
                .to(ingestor)
                .build();

            ingestor.enqueueMessage(message);
            log.debug("Extracted document sent to Ingestor: id={}", doc.getId());
        } catch (Exception e) {
            log.error("Error sending document to Ingestor: id={}", doc.getId(), e);
        }
    }
}
