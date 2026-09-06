package com.fourthbrain.actuators;

import com.fourthbrain.messaging.Message;
import com.fourthbrain.persistence.entity.Document;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;

@Component
@Slf4j
public class Classifier extends Actuator {

    private static final Queue<Message> classifierQueue = new ConcurrentLinkedQueue<>();

    public Classifier() {
        super();
        log.info("Classifier initialized");
    }


    @Override
    public String doTheThing(Message message) {
        if (message == null) {
            log.warn("Received null message");
            return null;
        }

        Document doc = message.getDocument();
        if (doc == null) {
            log.warn("Message contains null document");
            return null;
        }

        log.info("Classifying document: id={}, path={}", doc.getId(), doc.getPath());

        try {
            // TODO: Implement actual classification logic
            // - Call LLM (Ollama) to classify the document
            // - Extract tags and topic
            // - Create DocumentTag records
            // - Update document with topic

            log.debug("Document classification complete: id={}", doc.getId());

            // Return next actuator (Indexer) or null if end of pipeline
            return null;
        } catch (Exception e) {
            log.error("Error classifying document: id={}", doc.getId(), e);
            return null;
        }
    }

    public void enqueueMessage(Message message) {
        if (message != null) {
            classifierQueue.offer(message);
            log.debug("Message enqueued to Classifier: docId={}", message.getDocument().getId());
        }
    }
}
