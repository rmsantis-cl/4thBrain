package com.fourthbrain.messaging;

import com.fourthbrain.actuators.AbstractActuator;
import com.fourthbrain.actuators.IngestorActuator;
import com.fourthbrain.persistence.DatabaseService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import java.util.HashMap;
import java.util.Map;

/**
 * Coordinator bean. Entry point for starting pipelines.
 * Actuators chain directly via process() → next.message(docId).
 * No message routing needed.
 */
@Slf4j
@Component
public class Coordinator {

    private final Map<String, AbstractActuator> actuatorRegistry = new HashMap<>();

    @Autowired
    private DatabaseService databaseService;

    @Autowired
    private IngestorActuator[] ingestors;

    /**
     * Register an actuator in the registry (for monitoring).
     * Called by actuators during initialization.
     */
    public synchronized void register(String name, AbstractActuator actuator) {
        actuatorRegistry.put(name, actuator);
        log.info("Registered actuator: {}", name);
    }

    /**
     * Start a new pipeline (entry point).
     * Called by ingestion endpoints or file watchers.
     * Updates document status and enqueues to first Ingestor.
     */
    public synchronized void startChain(Long docId) {
        log.info("Starting chain for docId={}", docId);

        // Update document status to ingesting
        databaseService.updateDocumentStatus(docId, "ingesting");

        // Start the chain at first Ingestor thread
        ingestors[0].message(docId.intValue());
    }

    /**
     * Get actuator queue sizes (for monitoring/dashboard).
     */
    public synchronized Map<String, Integer> getQueueSizes() {
        Map<String, Integer> sizes = new HashMap<>();
        actuatorRegistry.forEach((name, actuator) -> {
            sizes.put(name, actuator.getQueueSize());
        });
        return sizes;
    }

    /**
     * Get overall pipeline status counts.
     */
    public synchronized Map<String, Long> getStatusCounts() {
        Map<String, Long> counts = new HashMap<>();
        counts.put("ingesting", databaseService.countDocumentsByStatus("ingesting"));
        counts.put("extracting", databaseService.countDocumentsByStatus("extracting"));
        counts.put("classifying", databaseService.countDocumentsByStatus("classifying"));
        counts.put("indexing", databaseService.countDocumentsByStatus("indexing"));
        counts.put("indexed", databaseService.countDocumentsByStatus("indexed"));
        return counts;
    }
}
