package com.fourthbrain.convert;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
public class DefaultProcessRunner implements ProcessRunner {

    @Override
    public ProcessResult run(
        List<String> command,
        Map<String, String> environment,
        Duration timeout,
        Path workDir,
        Path stderrFile
    ) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.directory(workDir.toFile());

        Map<String, String> env = pb.environment();
        env.putAll(environment);

        pb.redirectInput(ProcessBuilder.Redirect.DISCARD);
        pb.redirectOutput(ProcessBuilder.Redirect.DISCARD);
        pb.redirectError(stderrFile.toFile());

        Process process = pb.start();
        boolean timedOut = false;

        try {
            long timeoutMs = timeout.toMillis();
            boolean finished = process.waitFor(timeoutMs, TimeUnit.MILLISECONDS);

            if (!finished) {
                timedOut = true;
                killProcess(process, timeout);
                return new ProcessResult(-1, true);
            }

            return new ProcessResult(process.exitValue(), false);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            killProcess(process, timeout);
            throw e;
        }
    }

    private void killProcess(Process process, Duration timeout) {
        // Destroy gracefully
        process.destroy();
        try {
            Thread.sleep(2000); // Wait 2 seconds
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // Force kill if still alive
        if (process.isAlive()) {
            process.descendants().forEach(ProcessHandle::destroyForcibly);
            process.destroyForcibly();
            try {
                Thread.sleep(1000); // Wait 1 second
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }
}
