package com.fourthbrain.web.controller;

import com.fourthbrain.messaging.Coordinator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/status")
public class StatusController {

    @Autowired
    private Coordinator coordinator;

    @GetMapping
    public Map<String, Object> getStatus() {
        log.debug("Status check requested");
        Map<String, Long> statusCounts = coordinator.getStatusCounts();
        return Map.of(
            "ingesting", statusCounts.getOrDefault("ingesting", 0L),
            "extracting", statusCounts.getOrDefault("extracting", 0L),
            "classifying", statusCounts.getOrDefault("classifying", 0L),
            "indexing", statusCounts.getOrDefault("indexing", 0L),
            "indexed", statusCounts.getOrDefault("indexed", 0L)
        );
    }
}
