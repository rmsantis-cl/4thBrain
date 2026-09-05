package com.fourthbrain.web.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

@Controller
public class UIController {

    @GetMapping("/")
    public String redirect() {
        // Redirect root to /chat
        return "redirect:/chat";
    }

    @GetMapping("/chat")
    public String chat() {
        // Serve the main UI (index.html is served automatically by Spring Boot from static/)
        System.out.println("STUB: chat page requested");
        return "index";
    }
}
