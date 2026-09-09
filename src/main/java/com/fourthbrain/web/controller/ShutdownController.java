package com.fourthbrain.web.controller;

import com.fourthbrain.actuators.ActuatorManager;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Stops the application from outside (Story P1.15, ADR36).
 *
 * POST only: a GET would let a link, a prefetch or a crawler take the
 * application down. The actuator threads are stopped inline, so the response
 * can report how many were owned; the context close happens on a short delay
 * afterwards, because closing it inline would tear down the web server before
 * the answer reached the caller.
 */
@Slf4j
@RestController
public class ShutdownController {

    @Autowired
    private ActuatorManager actuatorManager;

    @Autowired
    private ApplicationContext context;

    /** Grace period between answering and closing the context. */
    @Value("${shutdown.close-delay-ms:500}")
    private long closeDelayMs;

    @PostMapping("/api/shutdown")
    public ResponseEntity<Map<String, Object>> shutdown() {
        log.info("Shutdown requested through /api/shutdown");

        int stopped = actuatorManager.shutdownAll();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "shutting down");
        body.put("actuatorsStopped", stopped);

        closeContextAfterResponse();
        return ResponseEntity.accepted().body(body);
    }

    /**
     * Closes the context on a daemon thread once the response has been written.
     * Closing it is enough to end the process: it stops the web server, whose
     * non-daemon thread is what keeps the JVM up, and every actuator thread is
     * a daemon. So there is no System.exit here, and a caller that wants an
     * exit code can read the one SpringApplication.exit reports.
     */
    private void closeContextAfterResponse() {
        Thread closer = new Thread(() -> {
            try {
                Thread.sleep(closeDelayMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
            log.info("Closing application context");
            SpringApplication.exit(context, () -> 0);
        }, "shutdown-endpoint");
        closer.setDaemon(true);
        closer.start();
    }
}
