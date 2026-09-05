package com.fourthbrain.actuators;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.util.Queue;
import java.util.LinkedList;

/**
 * TextExtractor actuator. Sanitizes binary content (PDF, HTML, etc).
 * Phase 1 Stub: Just logs and routes to Classifier.
 * All instances of TextExtractorActuator share the same static queue.
 */
@Slf4j
public class TextExtractorActuator extends AbstractActuator {

    // Static queue shared by all TextExtractorActuator instances
    private static final Queue<Integer> QUEUE = new LinkedList<>();

    @Autowired
    private ClassifierActuator classifier;

    public TextExtractorActuator() {
        setName("TextExtractor");
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
        return "extracting";
    }

    @Override
    public String getParticiple() {
        return "extracted";
    }

    @Override
    public Actuator process(Integer docId) {
        // Phase 1: Just log
        log.debug("Process docId={}", docId);
        // Return next actuator in chain
        return classifier;
    }
}
