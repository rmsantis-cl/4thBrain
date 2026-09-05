package com.fourthbrain.web.controller;

import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    @PostMapping("/llama")
    public Map<String, Object> chatWithLlama(@RequestBody Map<String, Object> payload) {
        // Phase 1 Stub: Return a dummy response
        String message = (String) payload.get("message");
        @SuppressWarnings("unchecked")
        List<Map<String, String>> history = (List<Map<String, String>>) payload.get("history");

        System.out.println("STUB: chatWithLlama called with message=" + message + ", history size=" + (history != null ? history.size() : 0));

        return Map.of(
            "reply", "(Phase 1 Stub) I received your message: " + message
        );
    }
}
