package com.fourthbrain.web.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

/**
 * Serves the single-page UI. Both mappings resolve the same template, so the
 * root needs no redirect to reach it (P1.14, ADR25).
 */
@Slf4j
@Controller
public class UIController {

    @GetMapping("/")
    public String root() {
        log.debug("UI requested at /");
        return "index";
    }

    @GetMapping("/chat")
    public String chat() {
        log.debug("UI requested at /chat");
        return "index";
    }
}
