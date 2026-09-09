package com.fourthbrain.actuators;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import org.springframework.core.annotation.Order;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Sole owner of actuator lifecycle (P1.9, see documents/design/STARTUP-SEQUENCE.md).
 *
 * Phase A (@PostConstruct) creates every actuator instance through its
 * ObjectFactory, which is what makes Spring inject it, and names it.
 * Phase B (@PostConstruct, after all instances exist) registers every
 * instance with the Coordinator. Phase C (ApplicationReadyEvent) starts every
 * thread, once, only after the context is fully refreshed and every actuator
 * is both injected and registered. Shutdown (@PreDestroy) stops every thread.
 */
@Slf4j
@Component
public class ActuatorManager {

    @Autowired
    private ObjectFactory<Ingestor> ingestorFactory;
    @Autowired
    private ObjectFactory<Extractor> extractorFactory;
    @Autowired
    private ObjectFactory<Classifier> classifierFactory;
    @Autowired
    private ObjectFactory<Indexer> indexerFactory;
    @Autowired
    private ObjectFactory<Clipper> clipperFactory;

    @Value("${actuators.threads.ingestor:1}")
    private int ingestorThreads;
    @Value("${actuators.threads.textExtractor:1}")
    private int extractorThreads;
    @Value("${actuators.threads.classifier:1}")
    private int classifierThreads;
    @Value("${actuators.threads.indexer:1}")
    private int indexerThreads;
    @Value("${actuators.threads.clipper:1}")
    private int clipperThreads;

    /** How long one thread is given to leave its run loop before it is left to the JVM (P1.15). */
    @Value("${actuators.shutdown.join-timeout-ms:5000}")
    private long joinTimeoutMs;

    private final List<Actuator> instances = new ArrayList<>();

    /** Guards against a second stop: /api/shutdown stops the threads, then @PreDestroy runs. */
    private final AtomicBoolean stopped = new AtomicBoolean(false);

    @PostConstruct
    public void initialize() {
        createInstances();
        registerInstances();
    }

    private void createInstances() {
        instances.addAll(createType(ingestorFactory, ingestorThreads, "Ingestor"));
        instances.addAll(createType(extractorFactory, extractorThreads, "Extractor"));
        instances.addAll(createType(classifierFactory, classifierThreads, "Classifier"));
        instances.addAll(createType(indexerFactory, indexerThreads, "Indexer"));
        instances.addAll(createType(clipperFactory, clipperThreads, "Clipper"));
    }

    private <T extends Actuator> List<T> createType(ObjectFactory<T> factory, int count, String typeName) {
        List<T> created = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            T a = factory.getObject();
            a.assignName(typeName + "-" + i);
            created.add(a);
        }
        log.info("Created {} {} instance(s)", count, typeName);
        return created;
    }

    private void registerInstances() {
        for (Actuator a : instances) {
            Coordinator.register(a);
        }
        log.info("Registered {} actuator instance(s)", instances.size());
    }

    // Ordered ahead of RecoveryService's listener (P1.16), so recovered work is
    // requeued to threads that are already reading their queues.
    @Order(10)
    @EventListener(ApplicationReadyEvent.class)
    public void startAll() {
        for (Actuator a : instances) {
            a.start();
        }
        log.info("Started {} actuator thread(s)", instances.size());
    }

    /** Every actuator instance, in creation order. */
    public List<Actuator> getInstances() {
        return Collections.unmodifiableList(instances);
    }

    /**
     * Signals every actuator to stop, then joins each with a bounded wait
     * (P1.15). Signalling all of them first matters: a thread blocked on its
     * queue leaves as soon as it is interrupted, so the joins that follow
     * normally return at once instead of costing the timeout each.
     * <p>
     * A thread still alive after its timeout is logged and left to the JVM,
     * which kills it on exit because actuators are daemon threads. Returns the
     * number of actuators the manager owns.
     */
    @PreDestroy
    public void onContextClose() {
        shutdownAll();
    }

    public int shutdownAll() {
        if (!stopped.compareAndSet(false, true)) {
            log.debug("Actuator threads already stopped");
            return instances.size();
        }

        for (Actuator a : instances) {
            a.shutdown();
        }

        int overran = 0;
        boolean interrupted = false;
        for (Actuator a : instances) {
            if (!interrupted) {
                try {
                    a.join(joinTimeoutMs);
                } catch (InterruptedException e) {
                    interrupted = true;
                }
            }
            if (a.isAlive()) {
                overran++;
                log.warn("{} did not exit within {} ms; leaving it to the JVM", a.getName(), joinTimeoutMs);
            }
        }
        if (interrupted) {
            Thread.currentThread().interrupt();
        }

        if (overran == 0) {
            log.info("Shut down {} actuator thread(s)", instances.size());
        } else {
            log.info("Shut down {} actuator thread(s); {} did not exit in time",
                    instances.size(), overran);
        }
        return instances.size();
    }
}
