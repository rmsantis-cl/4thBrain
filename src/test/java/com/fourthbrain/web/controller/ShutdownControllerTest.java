package com.fourthbrain.web.controller;

import com.fourthbrain.actuators.ActuatorManager;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Story P1.15 — the /api/shutdown endpoint.
 *
 * The close delay is set past the life of the test, so the endpoint's own daemon
 * thread never reaches the context close. What the endpoint does after it
 * answers is therefore not covered here; only the contract and the call into
 * ActuatorManager are.
 */
@WebMvcTest(ShutdownController.class)
@TestPropertySource(properties = "shutdown.close-delay-ms=600000")
@DisplayName("ShutdownController Tests")
class ShutdownControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ActuatorManager actuatorManager;

    @Test
    @DisplayName("POST /api/shutdown stops the actuators and reports how many")
    void postStopsActuators() throws Exception {
        when(actuatorManager.shutdownAll()).thenReturn(5);

        mockMvc.perform(post("/api/shutdown"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("shutting down"))
                .andExpect(jsonPath("$.actuatorsStopped").value(5));

        verify(actuatorManager, times(1)).shutdownAll();
    }

    @Test
    @DisplayName("GET /api/shutdown is not allowed")
    void getIsRejected() throws Exception {
        mockMvc.perform(get("/api/shutdown"))
                .andExpect(status().isMethodNotAllowed());

        verify(actuatorManager, never()).shutdownAll();
    }
}
