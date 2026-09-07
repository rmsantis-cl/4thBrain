package com.fourthbrain.messaging;

import java.util.Date;

import com.fourthbrain.actuators.Actuator;
import com.fourthbrain.persistence.entity.Document;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

/**
 * Message passed between actuators. Carries the fully-loaded Document, not an id
 * (ADR26): a message's recipient reads and mutates the same Document instance the
 * chain started with, rather than re-fetching it from the database on every hop.
 */

@Slf4j
@Getter
public class Message {

    private final Document document;
    private final Actuator from;
    private final Actuator to;
    private final Date createdAt;

    private Message(Actuator from, Actuator to, Document document) {
        this.from = from;
        this.to = to;
        this.document = document;
        this.createdAt = new Date();
        log.info("Created message from {} to {}: {}", from, to, document);
    }

    /** A message originating at the REST boundary, outside any actuator (ADR26). */
    public static Message to(Actuator target, Document document) {
        return new Message(null, target, document);
    }

    /** A message handed off from one actuator to the next. */
    public static Message between(Actuator from, Actuator to, Document document) {
        return new Message(from, to, document);
    }

    public static String toAddress(Object o) {
        return o == null ? "null" : String.format("%05x@%s", o.hashCode(), o.getClass().getSimpleName());
    }

    public String id() {
        String fromName = (from == null) ? "external" : from.getName();
        return String.format("Message[%s] (%s->%s)", toAddress(document), fromName, to.getName());
    }

    @Override
    public String toString() {
        return String.format("%s createdAt=%s ", id(), createdAt);
    }

}
