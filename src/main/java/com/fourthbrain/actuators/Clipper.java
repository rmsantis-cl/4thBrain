package com.fourthbrain.actuators;

import com.fourthbrain.messaging.Message;
import com.fourthbrain.persistence.DatabaseService;
import com.fourthbrain.persistence.entity.Document;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;

@Component
@Slf4j
public class Clipper extends Actuator {

    private static final Queue<Message> clipperQueue = new ConcurrentLinkedQueue<>();

    @Autowired
    private DatabaseService databaseService;

    @Autowired
    private Ingestor ingestor;

    public Clipper() {
        super();
        log.info("Clipper initialized");
    }

    @Override
    protected Queue<Message> getQueue() {
        return clipperQueue;
    }

    @Override
    public String getGerund() {
        return "clipping";
    }

    @Override
    public String getParticiple() {
        return "clipped";
    }

    @Override
    public String doTheThing(Document doc) {
        if (doc == null) {
            log.warn("Received null document");
            return null;
        }

        log.info("Clipping document: id={}, content={}", doc.getId(), doc.getContent());

        try {
            // Check if the document content is a URL
            String content = doc.getContent();
            if (content == null || !isValidUrl(content)) {
                log.warn("Document does not contain a valid URL: id={}", doc.getId());
                return null;
            }

            // Fetch content from the URL
            String fetchedContent = fetchUrlContent(content);
            if (fetchedContent == null || fetchedContent.isEmpty()) {
                log.warn("Failed to fetch content from URL: {}", content);
                return null;
            }

            // Create a new document with the fetched content
            Document childDoc = Document.builder()
                .parentId(doc.getId())
                .path(content) // Store the URL as path
                .name("clipped_" + doc.getName())
                .extension(".html")
                .mimeType("text/html")
                .content(fetchedContent)
                .status("New")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

            // Save the new document to database
            Document savedDoc = databaseService.create(childDoc);
            log.info("Clipped document created: id={}, parentId={}", savedDoc.getId(), savedDoc.getParentId());

            // Send the new document to Ingestor
            sendToIngestor(savedDoc);

            // Return null - clipping is complete
            return null;
        } catch (Exception e) {
            log.error("Error clipping document: id={}", doc.getId(), e);
            return null;
        }
    }

    private boolean isValidUrl(String urlString) {
        try {
            new URL(urlString);
            return urlString.startsWith("http://") || urlString.startsWith("https://");
        } catch (Exception e) {
            return false;
        }
    }

    private String fetchUrlContent(String urlString) {
        try {
            log.debug("Fetching content from URL: {}", urlString);

            URL url = new URL(urlString);
            java.net.URLConnection connection = url.openConnection();
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(10000);
            connection.setRequestProperty("User-Agent", "4thBrain/1.0");

            StringBuilder content = new StringBuilder();
            try (java.io.BufferedReader reader = new java.io.BufferedReader(
                new java.io.InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    content.append(line).append("\n");
                }
            }

            log.debug("Successfully fetched content from URL: {} (size: {})", urlString, content.length());
            return content.toString();
        } catch (Exception e) {
            log.error("Error fetching URL: {}", urlString, e);
            return null;
        }
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
            log.info("Clipped document sent to Ingestor: id={}", doc.getId());
        } catch (Exception e) {
            log.error("Error sending document to Ingestor: id={}", doc.getId(), e);
        }
    }
}
