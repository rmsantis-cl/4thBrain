package com.fourthbrain.config;

import com.fourthbrain.actuators.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Scope;

/**
 * Declares one prototype-scoped bean per actuator type, so Spring injects
 * dependencies into every instance created from it. ActuatorManager owns
 * how many instances to create, naming, registration and thread lifecycle (P1.9).
 */
@Configuration
public class ActuatorThreadConfig {

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
    @Scope("prototype")
    public Clipper clipper() {
        return new Clipper();
    }
}
