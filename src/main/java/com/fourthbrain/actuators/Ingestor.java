package com.fourthbrain.actuators;

import com.fourthbrain.messaging.Message;
import com.fourthbrain.persistence.entity.Document;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import java.net.URL;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;

@Component
@Slf4j
public class Ingestor extends Actuator {

    private static final Queue<Message> ingestorQueue = new ConcurrentLinkedQueue<>();

    public Ingestor() {
        super();
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
    public String doTheThing(Document doc) {
        if (doc == null) {
            log.warn("Received null document");
            return null;
        }

        log.info("Ingesting document: id={}, mimeType={}, content preview={}",
            doc.getId(), doc.getMimeType(),
            doc.getContent() != null ? doc.getContent().substring(0, Math.min(50, doc.getContent().length())) : "null");

        try {
            // Route based on document type
            if (isCompressedFile(doc)) {
                log.info("Document is compressed - routing to Extractor: id={}", doc.getId());
                return "Extractor";
            } else if (isUrl(doc)) {
                log.info("Document is URL - routing to Clipper: id={}", doc.getId());
                return "Clipper";
            } else if (isTextContent(doc)) {
                log.info("Document is text - routing to Indexer: id={}", doc.getId());
                return "Indexer";
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

}
