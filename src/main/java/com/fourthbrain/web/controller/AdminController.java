package com.fourthbrain.web.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

/**
 * Admin pages. The three templates carry no data of their own yet; the
 * database browser is the one expected to render server-side (ADR25).
 */
@Slf4j
@Controller
@RequestMapping("/admin")
public class AdminController {

    @GetMapping
    public String adminMenu() {
        log.debug("Admin menu requested");
        return "admin";
    }

    @GetMapping("/db")
    public String databaseBrowser() {
        log.debug("Database browser requested");
        return "admin-db";
    }

    @GetMapping("/api/docs")
    public String apiDocs() {
        log.debug("API docs requested");
        return "api-docs";
    }
}
