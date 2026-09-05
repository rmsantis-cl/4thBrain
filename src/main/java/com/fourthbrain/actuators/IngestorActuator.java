package com.fourthbrain.actuators;

import org.springframework.beans.factory.annotation.Autowired;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.util.Queue;
import java.util.LinkedList;

/**
 * Ingestor actuator. Reads files from $RAW_DIR.
 * Phase 1 Stub: Just logs and routes to TextExtractor.
 * All instances of IngestorActuator share the same static queue.
 */
public class IngestorActuator extends AbstractActuator {

    // Static queue shared by all IngestorActuator instances (horizontal scaling)
    private static final Queue<Integer> QUEUE = new LinkedList<>();

    @Autowired
    private TextExtractorActuator textExtractor;

    public IngestorActuator() {
        setName("Ingestor");
    }

    @PostConstruct
    public void init() {
        start();
    }

    @PreDestroy
    public void cleanup() {
        stopActuator();
    }

    @Override
    protected Queue<Integer> getQueue() {
        return QUEUE;
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
    public Actuator process(Integer docId) {
        // Phase 1: Just log
        System.out.println("[Ingestor] Process docId=" + docId);
        // Return next actuator in chain
        return textExtractor;
    }
}
