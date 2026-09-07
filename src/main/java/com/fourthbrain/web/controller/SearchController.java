package com.fourthbrain.web.controller;

import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    @GetMapping
    public Map<String, Object> search(@RequestParam("q") String query) {
        // Phase 1 Stub: Return empty results
        System.out.println("STUB: search called with query=" + query);
        return Map.of(
            "results", List.of(),
            "query", query
        );
    }
}
