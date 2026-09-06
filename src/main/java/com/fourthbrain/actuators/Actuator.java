package com.fourthbrain.actuators;

import com.fourthbrain.messaging.Message;
import com.fourthbrain.persistence.entity.Document;
import com.fourthbrain.service.DocumentService;

import java.util.HashMap;
import java.util.Map;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import lombok.*;

public abstract class Actuator extends Thread {

    private DocumentService service;
    private String ing;
    private String ed;
    private String name;
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private Logger log;
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private boolean running;

    private final Map<Class<?>, Queue<Message>> map = new HashMap<>();
    private final Map<Class<?>, Actuator> registry = new HashMap<>();

    public Actuator() {
        super();
        Coordinator.register(this);
        name = getClass().getSimpleName();
        setName(name);
        log = LoggerFactory.getLogger(getClass());
        setDaemon(true);
        log = LoggerFactory.getLogger(getClass());
        log.info("{}  started", name);
        running = true;
        ing = name.replace("er$", "ing");
        ed = name.replace("er$", "ed");
        log.info("{}   [ {} -> {} ] started", name, ing, ed);
        start();

    }

    protected Queue<Message> getQueue() {
        if (!map.containsKey(getClass())) {
            synchronized (map) {
                if (!map.containsKey(getClass())) {
                    map.put(getClass(), new ConcurrentLinkedQueue<>());
                }
            }
        }
        return map.get(getClass());
    }

    @Override
    public void run() {

        while (running) {
            try {
                log.debug("polling queue...");
                Message m = getQueue().poll();
                Document d = m.getDocument();
                if (d == null) {
                    log.debug("empty doc...");
                    continue;
                } else {
                    log.debug("queue ->  doc={} status={}", d.id(), d.getStatus());
                }
                String oldStatus = d.getStatus();
                service.setStatus(d, ing);
                log.info("processing doc={} {}->{}", d.id(), oldStatus, ing);
                String n = doTheThing(d);
                service.setStatus(d, ed);
                log.info("completed doc={} {}->{}", d.id(), ing, ed);
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

            } catch (Throwable t) {
                log.error("Main loop error", t);
            }

            log.info("Thread exiting.");
        }
    }

    public abstract String doTheThing(Document document);


}