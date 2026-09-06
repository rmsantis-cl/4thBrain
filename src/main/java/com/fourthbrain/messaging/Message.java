package com.fourthbrain.messaging;

import java.util.Date;

import com.fourthbrain.actuators.Actuator;
import com.fourthbrain.persistence.entity.Document;

import lombok.*;
import lombok.extern.slf4j.Slf4j;

/**
 * Simple message passed between actuators.
 * Carries only the document ID. Rest is in database.
 * Actuators log and pass to next stage.
 */

@Slf4j
@Data
@Builder 
@AllArgsConstructor 
public class Message {


    private Document document;
    private Actuator from;
    private Actuator to;
    private Date createdAt;



    public Message(Actuator from, Actuator to, Document payload) {
        setFrom(from);
        setTo(to);
        setDocument(payload);

        this.createdAt = new Date();
        log.info("Created message from {} to {}: {}", from, to, payload);
    }

    public static String toAddress ( Object o ) {
        return o==null?"null":String.format("%05x@%s", o.hashCode(), o.getClass().getSimpleName());
    }
    public String id() {

        return String.format("Mesasge[%s] (%s->%s)",toAddress(document),from.getName(),to.getName());
    }


    @Override
    public String toString() {
        return String.format("%s createdAt=%s ",id(), createdAt);
    }


}
