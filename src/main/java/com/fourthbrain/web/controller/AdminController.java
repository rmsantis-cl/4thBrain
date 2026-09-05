package com.fourthbrain.web.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/admin")
public class AdminController {

    @GetMapping
    public String adminMenu() {
        // Phase 1 Stub: Return a simple admin menu page
        System.out.println("STUB: adminMenu called");
        return "admin";
    }

    @GetMapping("/db")
    public String databaseBrowser() {
        // Phase 1 Stub: Return database browser page
        System.out.println("STUB: databaseBrowser called");
        return "admin-db";
    }

    @GetMapping("/api/docs")
    public String apiDocs() {
        // Phase 1 Stub: Return API docs page
        System.out.println("STUB: apiDocs called");
        return "api-docs";
    }
}
