package com.fourthbrain.service;

import com.fourthbrain.actuators.Actuator;
import com.fourthbrain.actuators.ActuatorManager;
import com.fourthbrain.messaging.Message;
import com.fourthbrain.persistence.DatabaseService;
import com.fourthbrain.persistence.VaultArea;
import com.fourthbrain.persistence.entity.Document;
import com.fourthbrain.persistence.entity.DocumentCopy;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Puts documents stranded by a crash back into the pipeline at startup
 * (Story P1.16, ADR37).
 *
 * A document in a gerund status was already taken off its actuator's queue when
 * the process died, so nothing holds it any more. Nothing polls for it either —
 * the pipeline is message-driven — so without this it sits in that status for
 * good.
 */
@Slf4j
@Service
public class RecoveryService {

    /** The gerund of the stage a document with no history is sent to. */
    static final String ENTRY_GERUND = "ingesting";

    /** The gerund whose documents are checked against the vault before being requeued. */
    static final String INDEXING_GERUND = "indexing";

    /** Status of a document that was created and never started. */
    static final String NEW_STATUS = "New";

    @Autowired
    private ActuatorManager actuatorManager;

    @Autowired
    private DocumentService documentService;

    @Autowired
    private DatabaseService databaseService;

    /**
     * How long a document may hold a gerund status before startup treats the
     * actuator that held it as crashed. Milliseconds rather than a Duration so
     * the value needs no conversion service to bind.
     */
    @Value("${recovery.stale-after-ms:3600000}")
    private long staleAfterMs;

    @Order(20)
    @EventListener(ApplicationReadyEvent.class)
    public void recoverOnStartup() {
        log.info("{}", recover().summary());
    }

    /**
     * One recovery pass. Public so a caller can run it outside startup and read
     * the report rather than the log.
     */
    public RecoveryReport recover() {
        Map<String, Actuator> byGerund = stagesByGerund();
        LocalDateTime cutoff = LocalDateTime.now().minus(Duration.ofMillis(staleAfterMs));

        Set<Long> handled = new HashSet<>();
        // Insertion-ordered, and stages are visited in actuator creation order,
        // so the report reads down the pipeline rather than alphabetically.
        Map<String, Integer> requeuedByStage = new LinkedHashMap<>();
        int reconciled = 0;
        int leftAlone = 0;

        for (Map.Entry<String, Actuator> stage : byGerund.entrySet()) {
            String gerund = stage.getKey();
            Actuator actuator = stage.getValue();

            for (Document d : documentService.getDocumentsByStatus(gerund)) {
                // One id is requeued at most once per pass, whatever it is
                // found under. Statuses are disjoint today, so this guards a
                // future overlap rather than a present one.
                if (d.getId() == null || !handled.add(d.getId())) {
                    continue;
                }
                if (!isStale(d, cutoff)) {
                    leftAlone++;
                    log.debug("doc={} has held {} since {}; still within the threshold",
                            d.getId(), gerund, d.getUpdatedAt());
                    continue;
                }
                if (INDEXING_GERUND.equals(gerund) && isInVault(d)) {
                    documentService.updateDocumentStatus(d.getId(), actuator.getParticiple());
                    reconciled++;
                    log.info("doc={} was already in the vault; marked {} instead of requeued",
                            d.getId(), actuator.getParticiple());
                    continue;
                }
                requeue(d, actuator);
                requeuedByStage.merge(gerund, 1, Integer::sum);
            }
        }

        Actuator entry = byGerund.get(ENTRY_GERUND);
        for (Document d : documentService.getDocumentsByStatus(NEW_STATUS)) {
            // No age threshold here. A document still at "New" never reached a
            // queue, and at startup no queue holds anything, so nothing else is
            // going to pick it up however recently it was created.
            if (d.getId() == null || !handled.add(d.getId())) {
                continue;
            }
            if (entry == null) {
                log.warn("No actuator answers to '{}'; doc={} stays at {}", ENTRY_GERUND, d.getId(), NEW_STATUS);
                continue;
            }
            requeue(d, entry);
            requeuedByStage.merge(NEW_STATUS, 1, Integer::sum);
        }

        return new RecoveryReport(requeuedByStage, reconciled, leftAlone);
    }

    /**
     * The first instance of each actuator class, keyed by its gerund. Taking the
     * first is correct because instances of one class share a static queue, so
     * enqueueing to any of them offers the work to all of them.
     */
    private Map<String, Actuator> stagesByGerund() {
        Map<String, Actuator> byGerund = new LinkedHashMap<>();
        for (Actuator a : actuatorManager.getInstances()) {
            byGerund.putIfAbsent(a.getGerund(), a);
        }
        return byGerund;
    }

    /** A document with no recorded update is treated as arbitrarily old. */
    private boolean isStale(Document d, LocalDateTime cutoff) {
        LocalDateTime updated = d.getUpdatedAt();
        return updated == null || updated.isBefore(cutoff);
    }

    /**
     * Whether the indexer's work survived it: a live copy in the indexing area
     * with a file still behind it.
     */
    private boolean isInVault(Document d) {
        DocumentCopy copy = databaseService.findLive(d.getId(), VaultArea.INDEXING);
        if (copy == null || copy.getPath() == null || copy.getPath().isBlank()) {
            return false;
        }
        Path path = Paths.get(copy.getPath());
        return Files.exists(path);
    }

    private void requeue(Document d, Actuator actuator) {
        // Message.to is the factory for a message with no sending actuator
        // (ADR26) — the same one the REST boundary uses. Recovery has no "from"
        // either: the actuator that held this document is gone with the process.
        actuator.enqueueMessage(Message.to(actuator, d));
        log.info("doc={} requeued to {} from status {}", d.getId(), actuator.getName(), d.getStatus());
    }

    /**
     * What one pass did. {@code byStage} counts requeues per status the
     * documents were found in.
     */
    public record RecoveryReport(Map<String, Integer> byStage, int reconciled, int leftAlone) {

        public int requeued() {
            return byStage.values().stream().mapToInt(Integer::intValue).sum();
        }

        /** The line written to the startup log. */
        public String summary() {
            if (requeued() == 0 && reconciled == 0) {
                return leftAlone == 0
                        ? "Crash recovery: nothing to recover"
                        : "Crash recovery: nothing to recover; " + leftAlone
                                + " document(s) still within the threshold";
            }

            List<String> parts = new ArrayList<>();
            for (Map.Entry<String, Integer> e : byStage.entrySet()) {
                parts.add(e.getValue() + " from " + e.getKey());
            }

            StringBuilder line = new StringBuilder();
            if (requeued() > 0) {
                line.append("Recovered ").append(requeued()).append(" document(s): ")
                        .append(String.join(", ", parts));
            }
            if (reconciled > 0) {
                if (line.length() > 0) {
                    line.append("; ");
                }
                line.append("reconciled ").append(reconciled)
                        .append(" already in the vault");
            }
            if (leftAlone > 0) {
                line.append("; left ").append(leftAlone).append(" still within the threshold");
            }
            return line.toString();
        }
    }
}
