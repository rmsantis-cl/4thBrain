package com.fourthbrain.actuators;

import com.fourthbrain.service.DocumentService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Story P1.9 — actuator instantiation and registration.
 *
 * Asserts against the Coordinator registry rather than log lines. The registry is
 * instance state on the injected Coordinator bean (P1.11, ADR26), so a second
 * @SpringBootTest context gets its own registry rather than inheriting this one's.
 *
 * @DirtiesContext closes this context — and stops its actuator threads — once
 * this class finishes. Without it, Spring's test-context cache keeps the context
 * (and its live threads) running for the rest of the test JVM: those threads
 * still poll the actuator classes' static, per-class queues (P1.9), so any later
 * test that enqueues to a real Ingestor races a background thread it has no way
 * to see. IngestorRoutingTest is what exposed this.
 */
@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:sqlite:build/test-fourthbrain.db",
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.sql.init.mode=always",
        "actuators.threads.ingestor=2"
})
@DisplayName("ActuatorManager Tests")
class ActuatorManagerTest {

    @Autowired
    private Coordinator coordinator;

    private static final List<String> ACTUATOR_NAMES =
            List.of("Ingestor", "Extractor", "Classifier", "Indexer", "Clipper");

    @Test
    @DisplayName("thread count property drives the number of instances created")
    void threadCountDrivesInstanceCount() {
        assertEquals(2, coordinator.instancesOf("Ingestor").size(),
                "actuators.threads.ingestor=2 should produce two Ingestor instances");

        for (String name : ACTUATOR_NAMES) {
            if (!name.equals("Ingestor")) {
                assertEquals(1, coordinator.instancesOf(name).size(),
                        name + " defaults to a single instance");
            }
        }
    }

    @Test
    @DisplayName("every actuator type is reachable through the Coordinator")
    void everyTypeIsRegistered() {
        for (String name : ACTUATOR_NAMES) {
            Actuator a = coordinator.get(name);
            assertNotNull(a, "coordinator.get(\"" + name + "\") returned null");
            assertEquals(name, a.getClass().getSimpleName());
        }
    }

    @Test
    @DisplayName("unknown names yield an empty list, not null")
    void unknownNameIsEmpty() {
        assertTrue(coordinator.instancesOf("Briefing").isEmpty());
        assertNull(coordinator.get("Briefing"));
    }

    @Test
    @DisplayName("Spring injects DocumentService into every instance")
    void everyInstanceIsInjected() {
        for (String name : ACTUATOR_NAMES) {
            for (Actuator a : coordinator.instancesOf(name)) {
                assertNotNull(ReflectionTestUtils.getField(a, "service"),
                        a.getName() + " has no DocumentService");
                assertInstanceOf(DocumentService.class, ReflectionTestUtils.getField(a, "service"));
            }
        }
    }

    @Test
    @DisplayName("instances of one type are named distinctly and share one queue")
    void instancesAreNamedAndShareAQueue() {
        List<Actuator> ingestors = coordinator.instancesOf("Ingestor");
        assertEquals("Ingestor-0", ingestors.get(0).getName());
        assertEquals("Ingestor-1", ingestors.get(1).getName());
        assertSame(ReflectionTestUtils.invokeMethod(ingestors.get(0), "getQueue"),
                ReflectionTestUtils.invokeMethod(ingestors.get(1), "getQueue"),
                "instances of one actuator class must share a static queue");
    }
}
