package com.fourthbrain.actuators;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.util.Queue;
import java.util.LinkedList;

/**
 * Briefing actuator. Scheduled to run daily.
 * Synthesizes a daily briefing from recent documents.
 * Phase 1 Stub: Just logs when triggered.
 * Not part of the main ingestion pipeline (no message queue processing).
 * All instances of BriefingActuator share the same static queue.
 */
@Slf4j
public class BriefingActuator extends AbstractActuator {

    // Static queue shared by all BriefingActuator instances (rarely used)
    private static final Queue<Integer> QUEUE = new LinkedList<>();

    public BriefingActuator() {
        setName("Briefing");
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
        return "synthesizing";
    }

    @Override
    public String getParticiple() {
        return "synthesized";
    }

    @Override
    public Actuator process(Integer docId) {
        // Briefing doesn't process individual documents from queue
        // It's triggered by @Scheduled, not by messages
        return null;
    }

    @Scheduled(cron = "0 6 * * *") // Run at 6 AM daily
    public void synthesizeDailyBriefing() {
        log.info("Daily synthesis triggered (6 AM)");
        // Phase 1: Just log
        // Phase 2: Query recent documents, call Ollama, write briefing markdown
    }
}
