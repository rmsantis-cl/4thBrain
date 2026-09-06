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
    public Ingestor ingestor() {
        return new Ingestor();
    }

    @Bean
    @Scope("prototype")
    public Extractor extractor() {
        return new Extractor();
    }

    @Bean
    @Scope("prototype")
    public Classifier classifier() {
        return new Classifier();
    }

    @Bean
    @Scope("prototype")
    public Indexer indexer() {
        return new Indexer();
    }

    @Bean
    public Ingestor[] ingestorActuators(ObjectFactory<Ingestor> factory) {
        Ingestor[] threads = new Ingestor[ingestorThreads];
        for (int i = 0; i < ingestorThreads; i++) {
            threads[i] = factory.getObject();
            threads[i].setName("Ingestor-" + i);
            threads[i].start();
        }
        log.info("Created {} Ingestor threads", ingestorThreads);
        return threads;
    }

    @Bean
    public Extractor[] extractorActuators(ObjectFactory<Extractor> factory) {
        Extractor[] threads = new Extractor[textExtractorThreads];
        for (int i = 0; i < textExtractorThreads; i++) {
            threads[i] = factory.getObject();
            threads[i].setName("Extractor-" + i);
            threads[i].start();
        }
        log.info("Created {} Extractor threads", textExtractorThreads);
        return threads;
    }

    @Bean
    public Classifier[] classifierActuators(ObjectFactory<Classifier> factory) {
        Classifier[] threads = new Classifier[classifierThreads];
        for (int i = 0; i < classifierThreads; i++) {
            threads[i] = factory.getObject();
            threads[i].setName("Classifier-" + i);
            threads[i].start();
        }
        log.info("Created {} Classifier threads", classifierThreads);
        return threads;
    }

    @Bean
    public Indexer[] indexerActuators(ObjectFactory<Indexer> factory) {
        Indexer[] threads = new Indexer[indexerThreads];
        for (int i = 0; i < indexerThreads; i++) {
            threads[i] = factory.getObject();
            threads[i].setName("Indexer-" + i);
            threads[i].start();
        }
        log.info("Created {} Indexer threads", indexerThreads);
        return threads;
    }
}
