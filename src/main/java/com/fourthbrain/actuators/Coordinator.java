package com.fourthbrain.actuators;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.fourthbrain.messaging.Message;
import com.fourthbrain.persistence.DatabaseService;
import com.fourthbrain.persistence.entity.Document;

import lombok.extern.slf4j.Slf4j;

/**
 * Coordinator. Registry is instance state, not static (ADR26 decision 3): Spring
 * caches test contexts, so a static registry never cleared between two
 * @SpringBootTest contexts would let the second inherit the first's actuators.
 */
@Slf4j
@Component
public class Coordinator {

    private static final String FIRST_STAGE = "Ingestor";

    @Autowired
    private DatabaseService databaseService;

    // Keyed by class simple name ("Ingestor"), not by thread name ("Ingestor-0"):
    // routing asks for the bare class name, and several instances of one class
    // share this same entry (P1.9).
    // Still concurrent: ActuatorManager registers on the main thread at startup,
    // every actuator thread reads on each routing hop. Registration is one-off
    // and reads are constant, which is what CopyOnWriteArrayList is for.
    private final Map<String, List<Actuator>> registry = new ConcurrentHashMap<>();

    public void register(Actuator a) {
        registry.computeIfAbsent(a.getClass().getSimpleName(), k -> new CopyOnWriteArrayList<>()).add(a);
    }

    /** Every registered instance of one actuator class; empty if the name is unknown. */
    public List<Actuator> instancesOf(String name) {
        List<Actuator> instances = registry.get(name);
        return (instances == null) ? List.of() : Collections.unmodifiableList(instances);
    }

    public Actuator get(String name) {
        List<Actuator> instances = instancesOf(name);
        return instances.isEmpty() ? null : instances.getFirst();
    }

    public Map<String, Long> getStatusCounts() {
        return registry.entrySet().stream()
                .collect(Collectors.toMap(x -> x.getKey(), x -> (long) x.getValue().getFirst().getQueue().size()));
    }

    /**
     * Sole entry point (ADR26 decision 1). Loads the document once, sets its
     * status to the first stage, and enqueues it to Ingestor inside a Message
     * carrying that same Document instance — no actuator downstream re-fetches
     * it (ADR26 decision 2).
     */
    public void startChain(long documentId) {
        Document doc = databaseService.getDocument(documentId);
        if (doc == null) {
            throw new IllegalArgumentException("startChain: no document with id " + documentId);
        }
        Actuator first = get(FIRST_STAGE);
        if (first == null) {
            throw new IllegalStateException("startChain: no '" + FIRST_STAGE + "' registered");
        }
        databaseService.updateDocumentStatus(documentId, first.getGerund());
        first.enqueueMessage(Message.to(first, doc));
        log.info("chain started doc={} -> {}", documentId, first.getName());
    }

}
