package com.fourthbrain.config;

import com.fourthbrain.actuators.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Scope;

/**
 * Instantiates actuator threads based on application.yaml configuration.
 * Each actuator type can run multiple instances sharing the same static queue.
 * Uses ObjectFactory to ensure Spring's dependency injection works on each instance.
 */
@Slf4j
@Configuration
public class ActuatorThreadConfig {

    @Value("${actuators.threads.ingestor:1}")
    private int ingestorThreads;

    @Value("${actuators.threads.textExtractor:1}")
    private int textExtractorThreads;

    @Value("${actuators.threads.classifier:1}")
    private int classifierThreads;

    @Value("${actuators.threads.indexer:1}")
    private int indexerThreads;

    @Bean
    @Scope("prototype")
    public IngestorActuator ingestorActuator() {
        return new IngestorActuator();
    }

    @Bean
    @Scope("prototype")
    public TextExtractorActuator textExtractorActuator() {
        return new TextExtractorActuator();
    }

    @Bean
    @Scope("prototype")
    public ClassifierActuator classifierActuator() {
        return new ClassifierActuator();
    }

    @Bean
    @Scope("prototype")
    public IndexerActuator indexerActuator() {
        return new IndexerActuator();
    }

    @Bean
    public IngestorActuator[] ingestorActuators(ObjectFactory<IngestorActuator> factory) {
        IngestorActuator[] threads = new IngestorActuator[ingestorThreads];
        for (int i = 0; i < ingestorThreads; i++) {
            threads[i] = factory.getObject();
            threads[i].setName("Ingestor-" + i);
            threads[i].init();
        }
        log.info("Created {} Ingestor threads", ingestorThreads);
        return threads;
    }

    @Bean
    public TextExtractorActuator[] textExtractorActuators(ObjectFactory<TextExtractorActuator> factory) {
        TextExtractorActuator[] threads = new TextExtractorActuator[textExtractorThreads];
        for (int i = 0; i < textExtractorThreads; i++) {
            threads[i] = factory.getObject();
            threads[i].setName("TextExtractor-" + i);
            threads[i].init();
        }
        log.info("Created {} TextExtractor threads", textExtractorThreads);
        return threads;
    }

    @Bean
    public ClassifierActuator[] classifierActuators(ObjectFactory<ClassifierActuator> factory) {
        ClassifierActuator[] threads = new ClassifierActuator[classifierThreads];
        for (int i = 0; i < classifierThreads; i++) {
            threads[i] = factory.getObject();
            threads[i].setName("Classifier-" + i);
            threads[i].init();
        }
        log.info("Created {} Classifier threads", classifierThreads);
        return threads;
    }

    @Bean
    public IndexerActuator[] indexerActuators(ObjectFactory<IndexerActuator> factory) {
        IndexerActuator[] threads = new IndexerActuator[indexerThreads];
        for (int i = 0; i < indexerThreads; i++) {
            threads[i] = factory.getObject();
            threads[i].setName("Indexer-" + i);
            threads[i].init();
        }
        log.info("Created {} Indexer threads", indexerThreads);
        return threads;
    }

    @Bean
    public BriefingActuator briefingActuator(ObjectFactory<BriefingActuator> factory) {
        BriefingActuator actuator = factory.getObject();
        actuator.setName("Briefing");
        actuator.init();
        log.info("Created Briefing (scheduled)");
        return actuator;
    }
}
