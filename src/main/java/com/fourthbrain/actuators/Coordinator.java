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

    private static Map<Class<?>, List<Actuator>> registry = new HashMap<>();
    private static Map<String, List<Actuator>> actuator = new HashMap<>();

    public static void register(Actuator a) {
        synchronized (registry) {
            if (!registry.containsKey(a.getClass())) {
                registry.put(a.getClass(), new ArrayList<>());
                actuator.put(a.getName(), new ArrayList<>());
            }
            registry.get(a.getClass()).add(a);
            actuator.get(a.getName()).add(a);

        }
    }

    public static Actuator get(String name) {
        return actuator.containsKey(name) ? actuator.get(name).getFirst() : null;
    }

    public void sendMessage(String actuator, Document doc) {
        get(actuator).getQueue().offer(new Message(null, get(actuator), doc));
    }

    public Map<String, Long> getStatusCounts() {
        return actuator.entrySet().stream()
                .collect(Collectors.toMap(x -> x.getKey(), x -> (long) x.getValue().getFirst().getQueue().size()));
    }

    public void startChain(long anyLong) {
        // TODO Auto-generated method stub
        throw new UnsupportedOperationException("Unimplemented method 'startChain'");
    }

}
