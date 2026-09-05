package com.fourthbrain.messaging;

import com.fourthbrain.persistence.entity.Document;

/**
 * Simple message passed between actuators.
 * Carries only the document ID. Rest is in database.
 * Actuators log and pass to next stage.
 */

@Slf4j
@Builder
public class Message {

    private Document payload;
    private Actuator from;
    private Actuator to;
    private Date createdAt;



    public Message(Actuator from, Actuator to, Document payload) {
        this.from = from;
        this.to = to;
        this.payload = payload;
        this.createdAt = new Date();
        log.info("Created message from {} to {}: {}", from, to, payload);
    }

    public static String toAddress ( Object o ) {
        return o==null?"null":String.format("%05x@%s", o.hashCode(), o.getClass().getSimpleName());
    }
    public String id() {

        return String.format("Mesasge[%s] (%s->%s)",toAddress(payload),from.getName(),to.getName());
    }


    @Override
    public String toString() {
        return String.format("%s createdAt=%s ",id(), createdAt);
    }
}
