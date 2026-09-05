package com.fourthbrain.monitoring;

import com.fourthbrain.actuators.Classifier;
import com.fourthbrain.messaging.Message;
import com.fourthbrain.persistence.DatabaseService;
import com.fourthbrain.persistence.entity.Document;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import javax.annotation.PostConstruct;
import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.HashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@Slf4j
public class SmartConnectionsMonitor {

    @Autowired
    private DatabaseService databaseService;

    @Autowired(required = false)
    private Classifier classifier;

    private static final Pattern SC_LOG_PATTERN = Pattern.compile(
        "SMART_CONNECTIONS:.*docId=(\\d+).*path=([^,]+).*mimeType=([^,]+).*name=([^}]+)"
    );

    private final Set<Long> processedDocuments = new HashSet<>();
    private volatile boolean running = false;
    private Thread monitorThread;

    @PostConstruct
    public void start() {
        log.info("Starting SmartConnectionsMonitor");
        running = true;
        monitorThread = new Thread(this::monitorSmartConnectionsLog, "SmartConnectionsMonitor");
        monitorThread.setDaemon(true);
        monitorThread.start();
    }

    private void monitorSmartConnectionsLog() {
        log.info("SmartConnectionsMonitor thread started - reading logs");

        while (running) {
            try {
                // Read from Spring Boot logs (in-memory log buffer)
                // In a real scenario, this would read from a log file or a message queue
                // For now, we'll monitor the database for newly indexed documents

                monitorIndexedDocuments();

                Thread.sleep(2000); // Check every 2 seconds
            } catch (InterruptedException e) {
                log.debug("SmartConnectionsMonitor interrupted");
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.error("Error in SmartConnectionsMonitor", e);
            }
        }

        log.info("SmartConnectionsMonitor thread stopped");
    }

    private void monitorIndexedDocuments() {
        try {
            // Get all documents with "indexed" status
            java.util.List<Document> indexedDocs = databaseService.getDocumentsByStatus("indexed");

            for (Document doc : indexedDocs) {
                if (!processedDocuments.contains(doc.getId())) {
                    log.info("Smart Connections detected indexed document: id={}, path={}",
                        doc.getId(), doc.getPath());

                    // Send to Classifier actuator
                    sendToClassifier(doc);

                    // Mark as processed
                    processedDocuments.add(doc.getId());
                }
            }
        } catch (Exception e) {
            log.error("Error monitoring indexed documents", e);
        }
    }

    private void sendToClassifier(Document doc) {
        if (classifier == null) {
            log.warn("Classifier actuator not available - cannot send document: id={}", doc.getId());
            return;
        }

        try {
            // Create a message and send to Classifier
            Message message = Message.builder()
                .document(doc)
                .from(null)
                .to(classifier)
                .build();

            classifier.enqueueMessage(message);
            log.info("Document sent to Classifier: id={}, docId={}", doc.getId());
        } catch (Exception e) {
            log.error("Error sending document to Classifier: id={}", doc.getId(), e);
        }
    }

    public void stop() {
        log.info("Stopping SmartConnectionsMonitor");
        running = false;
        if (monitorThread != null) {
            try {
                monitorThread.join(5000);
            } catch (InterruptedException e) {
                log.warn("Interrupted while stopping SmartConnectionsMonitor");
                Thread.currentThread().interrupt();
            }
        }
    }
}
