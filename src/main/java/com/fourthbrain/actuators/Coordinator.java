package com.fourthbrain.actuators;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
    private static final Map<String, List<Actuator>> registry = new HashMap<>();

    public static void register(Actuator a) {
        synchronized (registry) {
            registry.computeIfAbsent(a.getClass().getSimpleName(), k -> new ArrayList<>()).add(a);
        }
    }

    public static Actuator get(String name) {
        List<Actuator> instances = registry.get(name);
        return (instances == null || instances.isEmpty()) ? null : instances.getFirst();
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
