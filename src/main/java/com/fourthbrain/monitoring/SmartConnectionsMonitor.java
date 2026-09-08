package com.fourthbrain.monitoring;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Everything this application knows about Smart Connections, which today is
 * one startup check.
 * <p>
 * Story P2.5 splits in two. Part A puts documents into the indexing area of
 * the vault, correctly and atomically, and that is done. Part B — telling
 * Smart Connections about them — waits on ADR30, which has to settle whether
 * there is a call to make at all: the installed MCP server exposes four
 * read-side tools and nothing that indexes a file, so the write itself may
 * already be the trigger. Until that is measured, this class asserts nothing
 * about indexing and only reports whether the two paths line up.
 * <p>
 * The check exists because they currently do not. {@code vault.path} is
 * {@code ./vault} inside the repository, while the Obsidian vault the plugin
 * embeds lives elsewhere on disk. Repointing it belongs to its own change;
 * naming the mismatch at boot belongs here.
 */
@Component
@Slf4j
public class SmartConnectionsMonitor {

    /** Reserved for Part B. Nothing reads it yet beyond the warning below. */
    @Value("${smartconnections.enabled:false}")
    private boolean enabled;

    /** Absolute path to the Obsidian vault. Empty means "not configured". */
    @Value("${smartconnections.vault-path:}")
    private String smartConnectionsVaultPath;

    @Value("${vault.indexing}")
    private String vaultIndexingPath;

    @PostConstruct
    void checkVaultLayout() {
        if (enabled) {
            log.warn("smartconnections.enabled is true, but no indexing call is implemented yet "
                    + "(Story P2.5 Part B, blocked on ADR30). Documents still reach the vault.");
        }

        if (smartConnectionsVaultPath == null || smartConnectionsVaultPath.isBlank()) {
            log.info("Smart Connections vault path is not configured; "
                    + "documents are written to {} and nothing is told about them", vaultIndexingPath);
            return;
        }

        try {
            Path vault = Paths.get(smartConnectionsVaultPath).toAbsolutePath().normalize();
            Path indexing = Paths.get(vaultIndexingPath).toAbsolutePath().normalize();
            if (indexing.startsWith(vault)) {
                log.info("Indexing area {} is inside the Smart Connections vault {}", indexing, vault);
            } else {
                log.warn("Indexing area {} is not inside the Smart Connections vault {}; "
                        + "indexed documents will never be embedded", indexing, vault);
            }
        } catch (RuntimeException e) {
            log.warn("Could not compare the indexing area {} with the Smart Connections vault {}",
                    vaultIndexingPath, smartConnectionsVaultPath, e);
        }
    }
}
