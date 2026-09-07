package com.fourthbrain.actuators;

import com.fourthbrain.messaging.Message;
import com.fourthbrain.persistence.entity.Document;
import com.fourthbrain.persistence.entity.DocumentCopy;
import com.fourthbrain.persistence.DatabaseService;
import com.fourthbrain.persistence.VaultArea;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

@Slf4j
public class Indexer extends Actuator {

    private static final BlockingQueue<Message> indexerQueue = new LinkedBlockingQueue<>();

    @Value("${vault.indexing}")
    private String vaultIndexingPath;

    /**
     * The area the Indexer picks its source copy up from. It is tmp today,
     * because uploads land there and Ingestor routes straight on; it becomes
     * incoming once Extractor writes sanitized output (P2.3). Configured so
     * that shift is a config change, not a code change.
     */
    @Value("${vault.indexer.source-area}")
    private String sourceArea;

    @Autowired
    private DatabaseService databaseService;

    public Indexer() {
        super();
        log.info("Indexer initialized");
    }

    @Override
    protected BlockingQueue<Message> getQueue() {
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

        log.info("Indexing document: id={}", doc.getId());

        try {
            // Take the copy from the area this stage reads from
            DocumentCopy source = databaseService.findLive(doc.getId(), sourceArea);
            if (source == null) {
                log.warn("No live copy in area {} for document: id={}", sourceArea, doc.getId());
                return null;
            }

            Path sourcePath = Paths.get(source.getPath());

            // Create vault.indexing directory if it doesn't exist
            Path vaultIndexing = Paths.get(vaultIndexingPath);
            if (!Files.exists(vaultIndexing)) {
                Files.createDirectories(vaultIndexing);
            }

            // Build the destination path
            Path destPath = vaultIndexing.resolve(sourcePath.getFileName());

            // Move the file: retires the source copy, records the indexed one
            DocumentCopy indexed = databaseService.move(source, VaultArea.INDEXING, destPath.toString());
            log.info("Document indexed and moved: id={}, newPath={}", doc.getId(), indexed.getPath());

            // Log to Smart Connections for monitoring
            logToSmartConnections(doc, indexed);

            // Return null - this is the final stage in the pipeline
            return null;
        } catch (IOException e) {
            log.error("Error indexing document: id={}", doc.getId(), e);
            return null;
        }
    }

    private void logToSmartConnections(Document doc, DocumentCopy copy) {
        log.info("SMART_CONNECTIONS: Indexed document available");
        log.info("SMART_CONNECTIONS: docId={}, path={}, mimeType={}, name={}",
            doc.getId(), copy.getPath(), doc.getMimeType(), doc.getName());
    }
}
