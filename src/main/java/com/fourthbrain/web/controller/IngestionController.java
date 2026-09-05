package com.fourthbrain.web.controller;

import com.fourthbrain.messaging.Coordinator;
import com.fourthbrain.persistence.DatabaseService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/ingest")
public class IngestionController {

    @Autowired
    private Coordinator coordinator;

    @Autowired
    private DatabaseService databaseService;

    @PostMapping("/file")
    public Map<String, Object> uploadFile(@RequestParam("file") MultipartFile file,
                                          @RequestParam(value = "tags", required = false) String tags) {
        System.out.println("[IngestionController] uploadFile: " + file.getOriginalFilename() + ", tags=" + tags);

        // Create document in database
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown";
        Long docId = databaseService.createDocument(filename, "(file: " + filename + ")").getId();

        // Start pipeline
        coordinator.startChain(docId);

        return Map.of(
            "message", "File received and queued",
            "jobId", docId
        );
    }

    @PostMapping("/text")
    public Map<String, Object> submitText(@RequestBody Map<String, String> payload) {
        String text = payload.get("text");
        String tags = payload.get("tags");
        System.out.println("[IngestionController] submitText: text length=" + (text != null ? text.length() : 0) + ", tags=" + tags);

        // Create document in database
        Long docId = databaseService.createDocument("text", text).getId();

        // Start pipeline
        coordinator.startChain(docId);

        return Map.of(
            "message", "Text received and queued",
            "jobId", docId
        );
    }

    @PostMapping("/url")
    public Map<String, Object> submitUrl(@RequestBody Map<String, String> payload) {
        String url = payload.get("url");
        String tags = payload.get("tags");
        System.out.println("[IngestionController] submitUrl: " + url + ", tags=" + tags);

        // Create document in database
        Long docId = databaseService.createDocument(url, "(URL: " + url + ")").getId();

        // Start pipeline
        coordinator.startChain(docId);

        return Map.of(
            "message", "URL received and queued",
            "jobId", docId
        );
    }
}
