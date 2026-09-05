package com.fourthbrain.actuators;

import com.fourthbrain.persistence.DatabaseService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import lombok.*;
import lombok.AccessLevel;


@Data
 public abstract class Actuator extends Thread {


    DocumentService service;
    private static final ThreadGroup threadGroup = new ThreadGroup("Actuator");
    private String ing;
    private String ed;
    private String name;
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private Logger log;
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private boolean running;
  private final  Queue<Message> queue = new ConcurrentHashMap<>();

    public Actuator() {
        super(getClass().getSimpleName());
        log = LoggerFactory.getLogger(getClass());
        name = getClass().getSimpleName();
        setDaemon(true);
        log = LoggerFactory.getLogger(getClass());
        log.info("{}  started", name);
        running=true;
        ing=name.replace("er$","ing");
        ed =name.replace("er$","ed");
        log.info("{}   [ {} -> {} ] started", name,ing,ed);
        start();
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            log.info    ("Shutdown hook triggered");
            shutdown();
        }));
    }
    protected Queue<Message> getQueue() {
        if ( !queueMap.containsKey(getClass()) ) {
            synchronized(queueMap) {
                if ( !queueMap.containsKey(getClass()) ) {
                queueMap.put(getClass(), new ConcurrentLinkedQueue<>());
                }
            }
        }
        return queueMap.get(getClass());
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
                docService.setStatus(d, ing);
                log.info("processing doc={} {}->{}", d.id(), oldStatus, ing);
                doThing(d);
                docService.setStatus(d, ed);
                log.info("completed doc={} {}->{}", d.id(), ing, ed);
                Actuantor follow = getNextActuator(d);
                if (follow) {
                    Message next = Message.builder()
                        .document(d)
                        .from(this)
                        .to(nextActuator)
                        .build();
                    log.debug("message {}:  {} is ready for you", follow.name(), d.id());
                    follow.send(next);
                } else {
                    log.info("no next actuator for doc={}", d.id());
                }



            } catch (Throwable t) {
                log.error("Main loop error", t);
            }





        log.info("Thread exiting.");
    }

    /**
     * Enqueue a docId for processing.
     * Called by previous actuator or entry point (REST endpoint, file watcher).
     */
    public void message(Integer docId) {
        getQueue().offer(docId);
        log.debug("Enqueued docId={} (queue size: {})", docId, getQueue().size());
    }

    /**
     * Update document status in database.
     */
    private void updateStatus(Integer docId, String status) {
        databaseService.updateDocumentStatus(docId.longValue(), status);
    }

    /**
     * Stop the actuator gracefully.
     */
    public void stopActuator() {
        running = false;
        try {
            join(5000); // Wait up to 5 seconds
            if (isAlive()) {
                log.error("Did not stop gracefully.");
            }
        } catch (InterruptedException e) {
            log.error("Error stopping: {}", e.getMessage());
        }
    }

    /**
     * Get the static queue for this actuator class.
     * Each concrete subclass defines its own static Queue<Integer>.
     * Multiple instances share the same queue (horizontal scaling).
     */
    protected abstract java.util.Queue<Integer> getQueue();

    /**
     * Get the gerund (present participle) status.
     * E.g., "ingesting", "extracting", "classifying"
     */
    public abstract String getGerund();

    /**
     * Get the participle (past participle) status.
     * E.g., "ingested", "extracted", "classified"
     */
    public abstract String getParticiple();

    /**
     * Process a docId and return the next actuator in the chain.
     * Return null if this is the final stage.
     */
    public abstract String doTheThing(Message);

    /**
     * Get queue size (for monitoring).
     */
    public int getQueueSize() {
        return getQueue().size();
    }
}
