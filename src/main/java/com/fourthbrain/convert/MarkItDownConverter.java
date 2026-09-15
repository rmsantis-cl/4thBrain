package com.fourthbrain.convert;

import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
@ConditionalOnProperty(
    name = "fourthbrain.converter.implementation",
    havingValue = "markitdown",
    matchIfMissing = true
)
public class MarkItDownConverter implements MarkdownConverter {

    private final ConverterProperties properties;
    private final ProcessRunner processRunner;
    private volatile ProbeResult probeResult;
    private Semaphore concurrencySemaphore;
    private Path workDir;

    public MarkItDownConverter(ConverterProperties properties, ProcessRunner processRunner) {
        this.properties = properties;
        this.processRunner = processRunner;
    }

    @PostConstruct
    public void initialize() throws IllegalStateException {
        initializeWorkDir();
        initializeSemaphore();
        this.probeResult = performProbe();

        if (probeResult == null || !probeResult.available()) {
            if (properties.isFailFast()) {
                String msg = String.format(
                    "MarkItDown converter probe failed. Check executable path and installation. " +
                    "Detail: %s. Install with: python -m pip install markitdown[extras]",
                    probeResult != null ? probeResult.detail() : "probe failed"
                );
                throw new IllegalStateException(msg);
            } else {
                log.error("MarkItDown converter unavailable. Detail: {}",
                    probeResult != null ? probeResult.detail() : "probe failed");
            }
        }
    }

    private void initializeWorkDir() {
        String workDirPath = properties.getMarkitdown().getWorkDir();
        if (workDirPath == null || workDirPath.isEmpty()) {
            workDirPath = System.getProperty("java.io.tmpdir") + File.separator + "4thbrain-convert";
        }
        this.workDir = Paths.get(workDirPath);
        try {
            Files.createDirectories(this.workDir);
        } catch (Exception e) {
            log.warn("Could not create work directory {}: {}", this.workDir, e.getMessage());
        }
    }

    private void initializeSemaphore() {
        this.concurrencySemaphore = new Semaphore(properties.getMaxConcurrentProcesses());
    }

    private ProbeResult performProbe() {
        try {
            List<String> command = buildCommand(
                properties.getMarkitdown().getExecutable(),
                properties.getMarkitdown().getPython(),
                "--version"
            );

            if (command == null) {
                return new ProbeResult(false, "", "Neither executable nor python path configured");
            }

            Path stderrFile = Files.createTempFile("probe-", ".txt");
            try {
                ProcessRunner.ProcessResult result = processRunner.run(
                    command,
                    properties.getMarkitdown().getEnv(),
                    properties.getMarkitdown().getTimeout(),
                    workDir,
                    stderrFile
                );

                if (result.timedOut) {
                    return new ProbeResult(false, "", "Version check timed out");
                }

                if (result.exitCode != 0) {
                    String stderr;
                    try {
                        stderr = Files.exists(stderrFile) ?
                            new String(Files.readAllBytes(stderrFile), StandardCharsets.UTF_8) :
                            "";
                    } catch (Exception e) {
                        stderr = e.getMessage();
                    }
                    return new ProbeResult(false, "", "Version check failed: " + stderr);
                }

                String version = "markitdown";
                return new ProbeResult(true, version, "");
            } finally {
                Files.deleteIfExists(stderrFile);
            }
        } catch (Exception e) {
            log.error("Probe failed with exception", e);
            return new ProbeResult(false, "", "Probe failed: " + e.getMessage());
        }
    }

    @Override
    public String convert(Path source, String extensionHint) throws ConversionException {
        String ext = normalizeExtension(extensionHint);

        if ("zip".equalsIgnoreCase(ext)) {
            throw new ConversionException(
                ConversionException.Reason.UNSUPPORTED_FORMAT,
                "ZIP archives are not directly converted; use Extractor for archive expansion"
            );
        }

        if (!supports(ext)) {
            throw new ConversionException(
                ConversionException.Reason.UNSUPPORTED_FORMAT,
                "Extension not supported: " + ext
            );
        }

        if (probeResult == null || !probeResult.available()) {
            throw new ConversionException(
                ConversionException.Reason.UNAVAILABLE,
                "Converter is not available"
            );
        }

        try {
            long fileSize = Files.size(source);
            if (fileSize > properties.getMaxInputBytes()) {
                throw new ConversionException(
                    ConversionException.Reason.TOO_LARGE,
                    String.format("Input file too large: %d bytes", fileSize)
                );
            }
        } catch (ConversionException e) {
            throw e;
        } catch (Exception e) {
            throw new ConversionException(
                ConversionException.Reason.IO_ERROR,
                "Could not check file size: " + e.getMessage(),
                e
            );
        }

        boolean acquired = false;
        try {
            acquired = concurrencySemaphore.tryAcquire(
                properties.getMarkitdown().getTimeout().toMillis(),
                TimeUnit.MILLISECONDS
            );
            if (!acquired) {
                throw new ConversionException(
                    ConversionException.Reason.TIMEOUT,
                    "Could not acquire conversion permit within timeout"
                );
            }

            return performConversion(source, ext);
        } catch (ConversionException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ConversionException(
                ConversionException.Reason.TIMEOUT,
                "Conversion interrupted",
                e
            );
        } finally {
            if (acquired) {
                concurrencySemaphore.release();
            }
        }
    }

      @SneakyThrows 
    private String performConversion(Path source, String ext)  {
        String uuid = UUID.randomUUID().toString();
        Path stagedInput = workDir.resolve("in-" + uuid + "." + ext);
        Path outputFile = workDir.resolve("out-" + uuid + ".md");
        Path stderrFile = workDir.resolve("err-" + uuid + ".txt");

        try {
            Files.copy(source, stagedInput);

            List<String> command = buildConversionCommand(stagedInput, outputFile);
            if (command == null) {
                throw new ConversionException(
                    ConversionException.Reason.UNAVAILABLE,
                    "No valid converter configuration"
                );
            }

            ProcessRunner.ProcessResult result = processRunner.run(
                command,
                properties.getMarkitdown().getEnv(),
                properties.getMarkitdown().getTimeout(),
                workDir,
                stderrFile
            );

            if (result.timedOut) {
                throw new ConversionException(
                    ConversionException.Reason.TIMEOUT,
                    "Conversion timed out"
                );
            }

            if (result.exitCode != 0) {
                String stderr = Files.exists(stderrFile) ?
                    new String(Files.readAllBytes(stderrFile), StandardCharsets.UTF_8) :
                    "";
                stderr = stderr.length() > 8192 ? stderr.substring(0, 8192) : stderr;
                throw new ConversionException(
                    ConversionException.Reason.CONVERTER_FAILED,
                    "Conversion failed: " + stderr
                );
            }

            if (!Files.exists(outputFile)) {
                throw new ConversionException(
                    ConversionException.Reason.CONVERTER_FAILED,
                    "Converter did not produce output file"
                );
            }

            long outputSize = Files.size(outputFile);
            if (outputSize > properties.getMaxOutputBytes()) {
                throw new ConversionException(
                    ConversionException.Reason.OUTPUT_TOO_LARGE,
                    String.format("Output too large: %d bytes", outputSize)
                );
            }

            String markdown = new String(Files.readAllBytes(outputFile), StandardCharsets.UTF_8);
            markdown = normalizeMarkdown(markdown);

            if (countNonWhitespace(markdown) < properties.getMinOutputChars()) {
                throw new ConversionException(
                    ConversionException.Reason.EMPTY_RESULT,
                    "Conversion produced empty or whitespace-only output"
                );
            }

            return markdown;
        } catch (IOException e) {
            log.error("failed",e);
        } finally {
            try {
                Files.deleteIfExists(stagedInput);
                Files.deleteIfExists(outputFile);
                Files.deleteIfExists(stderrFile);
            } catch (Exception e) {
                log.warn("Error cleaning up temporary files: {}", e.getMessage());
            }
        }
        return null;
    }

    private List<String> buildConversionCommand(Path input, Path output) {
        String executable = properties.getMarkitdown().getExecutable();
        String python = properties.getMarkitdown().getPython();

        if (executable != null && !executable.isEmpty()) {
            return List.of(executable, input.toString(), "-o", output.toString());
        } else if (python != null && !python.isEmpty()) {
            return List.of(python, "-m", "markitdown", input.toString(), "-o", output.toString());
        }
        return null;
    }

    private List<String> buildCommand(String executable, String python, String... args) {
        List<String> command = new ArrayList<>();

        if (executable != null && !executable.isEmpty()) {
            command.add(executable);
        } else if (python != null && !python.isEmpty()) {
            command.add(python);
            command.add("-m");
            command.add("markitdown");
        } else {
            return null;
        }

        command.addAll(Arrays.asList(args));
        return command;
    }

    @Override
    public boolean supports(String extensionHint) {
        if (extensionHint == null || extensionHint.isEmpty()) {
            return false;
        }

        String normalized = extensionHint.toLowerCase().replaceFirst("^\\.", "");

        if (properties.getPassthroughExtensions().contains(normalized)) {
            return false;
        }

        return properties.getSupportedExtensions().contains(normalized);
    }

    @Override
    public ProbeResult probe() {
        return probeResult;
    }

    private String normalizeExtension(String hint) {
        if (hint == null || hint.isEmpty()) {
            return "";
        }
        return hint.toLowerCase().replaceFirst("^\\.", "");
    }

    private String normalizeMarkdown(String markdown) {
        if (markdown.startsWith("﻿")) {
            markdown = markdown.substring(1);
        }
        markdown = markdown.replace("\r\n", "\n").replace("\r", "\n");
        return markdown;
    }

    private int countNonWhitespace(String str) {
        return (int) str.chars().filter(c -> !Character.isWhitespace(c)).count();
    }
}
