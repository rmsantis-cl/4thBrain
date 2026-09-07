package com.fourthbrain.actuators;

import com.fourthbrain.messaging.Message;
import com.fourthbrain.persistence.entity.Document;
import lombok.extern.slf4j.Slf4j;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

@Slf4j
public class Classifier extends Actuator {

    private static final BlockingQueue<Message> classifierQueue = new LinkedBlockingQueue<>();

    public Classifier() {
        super();
        log.info("Classifier initialized");
    }

    @Override
    protected BlockingQueue<Message> getQueue() {
        return classifierQueue;
    }

    @Override
    public String getGerund() {
        return "classifying";
    }

    @Override
    public String getParticiple() {
        return "classified";
    }

    @Override
    public String doTheThing(Document doc) {
        if (doc == null) {
            log.warn("Received null document");
            return null;
        }

        log.info("Classifying document: id={}, name={}", doc.getId(), doc.getName());

        try {
            // TODO: Implement actual classification logic
            // - Call LLM (Ollama) to classify the document
            // - Extract tags and topic
            // - Create DocumentTag records
            // - Update document with topic

            log.debug("Document classification complete: id={}", doc.getId());

            return "Indexer";
        } catch (Exception e) {
            log.error("Error classifying document: id={}", doc.getId(), e);
            return null;
        }
    }
}
