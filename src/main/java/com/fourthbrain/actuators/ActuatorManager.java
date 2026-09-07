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

import java.util.ArrayList;
import java.util.List;

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

    private final List<Actuator> instances = new ArrayList<>();

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

    @EventListener(ApplicationReadyEvent.class)
    public void startAll() {
        for (Actuator a : instances) {
            a.start();
        }
        log.info("Started {} actuator thread(s)", instances.size());
    }

    @PreDestroy
    public void shutdownAll() {
        for (Actuator a : instances) {
            a.shutdown();
        }
        log.info("Shut down {} actuator thread(s)", instances.size());
    }
}
