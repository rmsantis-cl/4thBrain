package com.fourthbrain.actuators;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.fourthbrain.messaging.Message;
import com.fourthbrain.persistence.entity.Document;

/**
 * Coordinator
 */
@Component
public class Coordinator {

    // Keyed by class simple name ("Ingestor"), not by thread name ("Ingestor-0"):
    // routing asks for the bare class name, and several instances of one class
    // share this same entry (P1.9).
    // Concurrent both ways: ActuatorManager registers on the main thread at
    // startup, every actuator thread reads on each routing hop. Registration is
    // one-off and reads are constant, which is what CopyOnWriteArrayList is for.
    private static final Map<String, List<Actuator>> registry = new ConcurrentHashMap<>();

    public static void register(Actuator a) {
        registry.computeIfAbsent(a.getClass().getSimpleName(), k -> new CopyOnWriteArrayList<>()).add(a);
    }

    /** Every registered instance of one actuator class; empty if the name is unknown. */
    public static List<Actuator> instancesOf(String name) {
        List<Actuator> instances = registry.get(name);
        return (instances == null) ? List.of() : Collections.unmodifiableList(instances);
    }

    public static Actuator get(String name) {
        List<Actuator> instances = instancesOf(name);
        return instances.isEmpty() ? null : instances.getFirst();
    }

    public void sendMessage(String actuator, Document doc) {
        get(actuator).getQueue().offer(new Message(null, get(actuator), doc));
    }

    public Map<String, Long> getStatusCounts() {
        return registry.entrySet().stream()
                .collect(Collectors.toMap(x -> x.getKey(), x -> (long) x.getValue().getFirst().getQueue().size()));
    }

    public void startChain(long anyLong) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'startChain'");
    }

}
