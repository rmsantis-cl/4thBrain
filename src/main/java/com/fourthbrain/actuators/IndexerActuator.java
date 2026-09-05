package com.fourthbrain.actuators;

import com.fourthbrain.persistence.DatabaseService;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.util.Queue;
import java.util.LinkedList;
import lombok.*;
/**
 * Indexer actuator. Indexes documents to vault and Smart Connections.
 * Phase 1 Stub: Just logs and marks document as done.
 * Final stage in the pipeline (returns null).
 * All instances of IndexerActuator share the same static queue.
 */
@Component
public class IndexerActuator extends AbstractActuator {

    // Static queue shared by all IndexerActuator instances
    private static final Queue<Integer> QUEUE = new LinkedList<>();


    public IndexerActuator() {
        setName("Indexer");
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
        return "indexing";
    }

    @Override
    public String getParticiple() {
        return "indexed";
    }

    @Override
    public Actuator process(Integer docId) {
        // Phase 1: Just log
        System.out.println("[Indexer] Process docId=" + docId);
        // No next actuator (final stage)
        return null;
    }
}
