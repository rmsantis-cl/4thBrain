package com.fourthbrain.actuators;

import com.fourthbrain.messaging.Message;
import com.fourthbrain.persistence.entity.Document;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import java.net.URL;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;

@Component
@Slf4j
public class Ingestor extends Actuator {

    private static final Queue<Message> ingestorQueue = new ConcurrentLinkedQueue<>();

    @Autowired(required = false)
    private Extractor extractor;

    @Autowired(required = false)
    private Clipper clipper;

    @Autowired(required = false)
    private Indexer indexer;

    public Ingestor() {
        super(Ingestor.class);
        log.info("Ingestor initialized");
    }

    @Override
    protected Queue<Message> getQueue() {
        return ingestorQueue;
    }

    @Override
    public String getGerund() {
        return "ingesting";
    }

    @Override
    public String getParticiple() {
        return "ingested";
    }

    @Override
    public Actuator doTheThing(Message message) {
        if (message == null) {
            log.warn("Received null message");
            return null;
        }

        Document doc = message.getDocument();
        if (doc == null) {
            log.warn("Message contains null document");
            return null;
        }

        log.info("Ingesting document: id={}, mimeType={}, content preview={}",
            doc.getId(), doc.getMimeType(),
            doc.getContent() != null ? doc.getContent().substring(0, Math.min(50, doc.getContent().length())) : "null");

        try {
            // Route based on document type
            if (isCompressedFile(doc)) {
                log.info("Document is compressed - routing to Extractor: id={}", doc.getId());
                sendToExtractor(doc);
                return null;
            } else if (isUrl(doc)) {
                log.info("Document is URL - routing to Clipper: id={}", doc.getId());
                sendToClipper(doc);
                return null;
            } else if (isTextContent(doc)) {
                log.info("Document is text - routing to Indexer: id={}", doc.getId());
                sendToIndexer(doc);
                return null;
            } else {
                log.warn("Document type not recognized: id={}, mimeType={}", doc.getId(), doc.getMimeType());
                return null;
            }
        } catch (Exception e) {
            log.error("Error ingesting document: id={}", doc.getId(), e);
            return null;
        }
    }

    private boolean isCompressedFile(Document doc) {
        String mimeType = doc.getMimeType();
        String extension = doc.getExtension();

        if (mimeType != null) {
            return mimeType.equals("application/zip") ||
                   mimeType.equals("application/x-zip-compressed") ||
                   mimeType.equals("application/x-rar-compressed") ||
                   mimeType.equals("application/x-7z-compressed") ||
                   mimeType.equals("application/gzip");
        }

        if (extension != null) {
            String ext = extension.toLowerCase();
            return ext.equals(".zip") || ext.equals(".rar") || ext.equals(".7z") || ext.equals(".gz");
        }

        return false;
    }

    private boolean isUrl(Document doc) {
        String content = doc.getContent();
        if (content == null || content.isEmpty()) {
            return false;
        }

        content = content.trim();
        try {
            new URL(content);
            return content.startsWith("http://") || content.startsWith("https://");
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isTextContent(Document doc) {
        String mimeType = doc.getMimeType();
        if (mimeType != null) {
            return mimeType.startsWith("text/") ||
                   mimeType.equals("application/json") ||
                   mimeType.equals("application/xml") ||
                   mimeType.equals("application/pdf");
        }

        String extension = doc.getExtension();
        if (extension != null) {
            String ext = extension.toLowerCase();
            return ext.matches("\\.(txt|md|html|json|xml|csv|log)");
        }

        return false;
    }

    private void sendToExtractor(Document doc) {
        if (extractor == null) {
            log.warn("Extractor actuator not available");
            return;
        }

        try {
            Message message = Message.builder()
                .document(doc)
                .from(this)
                .to(extractor)
                .build();
            extractor.enqueueMessage(message);
            log.debug("Document sent to Extractor: id={}", doc.getId());
        } catch (Exception e) {
            log.error("Error sending to Extractor: id={}", doc.getId(), e);
        }
    }

    private void sendToClipper(Document doc) {
        if (clipper == null) {
            log.warn("Clipper actuator not available");
            return;
        }

        try {
            Message message = Message.builder()
                .document(doc)
                .from(this)
                .to(clipper)
                .build();
            clipper.enqueueMessage(message);
            log.debug("Document sent to Clipper: id={}", doc.getId());
        } catch (Exception e) {
            log.error("Error sending to Clipper: id={}", doc.getId(), e);
        }
    }

    private void sendToIndexer(Document doc) {
        if (indexer == null) {
            log.warn("Indexer actuator not available");
            return;
        }

        try {
            Message message = Message.builder()
                .document(doc)
                .from(this)
                .to(indexer)
                .build();
            indexer.enqueueMessage(message);
            log.debug("Document sent to Indexer: id={}", doc.getId());
        } catch (Exception e) {
            log.error("Error sending to Indexer: id={}", doc.getId(), e);
        }
    }

    public void enqueueMessage(Message message) {
        if (message != null) {
            ingestorQueue.offer(message);
            log.debug("Message enqueued to Ingestor: docId={}", message.getDocument().getId());
        }
    }
}
