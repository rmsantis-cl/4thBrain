package com.fourthbrain.actuators;

import com.fourthbrain.messaging.Message;
import com.fourthbrain.persistence.entity.Document;
import com.fourthbrain.persistence.DatabaseService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;

@Component
@Slf4j
public class Indexer extends Actuator {

    private static final Queue<Message> indexerQueue = new ConcurrentLinkedQueue<>();

    @Value("${vault.indexing}")
    private String vaultIndexingPath;

    @Autowired
    private DatabaseService databaseService;

    public Indexer() {
        super();
        log.info("Indexer initialized");
    }

    @Override
    protected Queue<Message> getQueue() {
        return indexerQueue;
    }

    @Override
    public String getGerund() {
        return "indexing";
    }

    @Override
    public String getParticiple() {
        return "indexed";
    }

    @Override
    public String doTheThing(Document doc) {
        if (doc == null) {
            log.warn("Received null document");
            return null;
        }

        log.info("Indexing document: id={}, path={}", doc.getId(), doc.getPath());

        try {
            // Get the current file path
            Path sourcePath = Paths.get(doc.getPath());

            // Create vault.indexing directory if it doesn't exist
            Path vaultIndexing = Paths.get(vaultIndexingPath);
            if (!Files.exists(vaultIndexing)) {
                Files.createDirectories(vaultIndexing);
            }

            // Build the destination path
            Path destPath = vaultIndexing.resolve(sourcePath.getFileName());

            // Move the file and update the database using DatabaseService
            Document updatedDoc = databaseService.move(doc, destPath.toString());
            log.info("Document indexed and moved: id={}, newPath={}", updatedDoc.getId(), destPath);

            // Log to Smart Connections for monitoring
            logToSmartConnections(updatedDoc);

            // Return null - this is the final stage in the pipeline
            return null;
        } catch (IOException e) {
            log.error("Error indexing document: id={}", doc.getId(), e);
            return null;
        }
    }

    private void logToSmartConnections(Document doc) {
        log.info("SMART_CONNECTIONS: Indexed document available");
        log.info("SMART_CONNECTIONS: docId={}, path={}, mimeType={}, name={}",
            doc.getId(), doc.getPath(), doc.getMimeType(), doc.getName());
    }
}
