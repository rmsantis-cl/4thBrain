package com.fourthbrain.actuators;

import com.fourthbrain.messaging.Message;
import com.fourthbrain.persistence.entity.Document;
import com.fourthbrain.service.DocumentService;

import java.util.concurrent.BlockingQueue;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import lombok.*;

public abstract class Actuator extends Thread {

    @Autowired
    private DocumentService service;
    private String name;
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private Logger log;
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private boolean running;

    public Actuator() {
        super();
        name = getClass().getSimpleName();
        setName(name);
        log = LoggerFactory.getLogger(getClass());
        setDaemon(true);
        running = true;
        log.info("{}   [ {} -> {} ] created", name, getGerund(), getParticiple());
        // Registration and start() happen in ActuatorManager, after Spring has
        // injected this instance and every sibling actuator has been created (P1.9).
    }

    /** Sets both Thread's name and the field this class logs with, so a rename by
     * ActuatorManager (e.g. "Ingestor" -> "Ingestor-0") shows up in the logs too.
     * Thread.setName() is final, so this can't just override it. */
    public void assignName(String name) {
        setName(name);
        this.name = name;
    }

    /** Stops the run loop and waits (bounded) for the thread to exit. */
    public void shutdown() {
        running = false;
        interrupt();
        try {
            join(5000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    // No default implementation: each subclass owns a static queue so instances
    // of the same class share it (horizontal scaling). A per-instance HashMap
    // here used to build a separate queue per object, silently defeating that.
    protected abstract BlockingQueue<Message> getQueue();

    public void enqueueMessage(Message message) {
        if (message != null) {
            getQueue().offer(message);
            log.debug("Message enqueued to {}: docId={}", name, message.getDocument().getId());
        }
    }

    @Override
    public void run() {

        while (running) {
            try {
                log.debug("waiting for next message...");
                Message m = getQueue().take();
                Document d = (m == null) ? null : m.getDocument();
                if (d == null) {
                    log.warn("Skipping message with no document");
                    continue;
                }
                log.debug("queue ->  doc={} status={}", d.id(), d.getStatus());

                String oldStatus = d.getStatus();
                service.setStatus(d, getGerund());
                log.info("processing doc={} {}->{}", d.id(), oldStatus, getGerund());
                String n = doTheThing(d);
                service.setStatus(d, getParticiple());
                log.info("completed doc={} {}->{}", d.id(), getGerund(), getParticiple());
                if (n != null) {
                    Actuator follow = Coordinator.get(n);
                    Message next = Message.builder()
                            .document(d)
                            .from(this)
                            .to(follow)
                            .build();
                    log.debug("message {}:  {} is ready for you", follow.getName(), d.id());
                    follow.getQueue().offer(next);
                } else {
                    log.info("no next actuator for doc={}", d.id());
                }

            } catch (InterruptedException e) {
                // shutdown() interrupts us to stop the loop; not a processing failure.
                Thread.currentThread().interrupt();
            } catch (Exception e) {
                log.error("Main loop error", e);
            }
        }

        log.info("Thread exiting.");
    }

    /** Status while this actuator is working, e.g. "ingesting". */
    public abstract String getGerund();

    /** Status once this actuator is done, e.g. "ingested". */
    public abstract String getParticiple();

    /** Processes the document; returns the name of the next actuator, or null to end the chain. */
    public abstract String doTheThing(Document document);


}