xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxpackage com.fourthbrain.actuators;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import jakarta.annotation.PostConstruct;
import jakarta.Xannotation.PreDestroy;
import java.util.Queue;
import java.util.LinkedList;

/**
 * Classifier actuator. Calls Ollama to infer tags and topic.
 * Phase 1 Stub: Just logs and routes to Indexer.
 * All instances of ClassifierActuator share the same static queue (concurrency=1 via Semaphore in Phase 2).
 */
@Slf4j
public class ClassifierActuator extends AbstractActuator {

    // Static queue shared by all ClassifierActuator instances
    private static final Queue<Integer> QUEUE = new LinkedList<>();

    @Autowired
    private IndexerActuator indexer;

    public ClassifierActuator() {
        setName("Classifier");
    }

    @PostConstruct
    public void init() {
        start();
    }

    @PreDestroy
    public void cleanup() {
        stopActuator();
    }

    @Override
    protected Queue<Integer> getQueue() {
        return QUEUE;
    }

    @Override
    public String getGerund() {
        return "classifying";
    }

    @Override
    public String getParticiple() {
        return "classified";
    }

    @Override
    public Actuator process(Integer docId) {
        // Phase 1: Just log
        log.debug("Process docId={}", docId);
        // Return next actuator in chain
        return indexer;
    }
}
