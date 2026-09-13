package com.fourthbrain.convert;

import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.Map;

public interface ProcessRunner {
    ProcessResult run(
        List<String> command,
        Map<String, String> environment,
        Duration timeout,
        Path workDir,
        Path stderrFile
    ) throws Exception;

    class ProcessResult {
        public final int exitCode;
        public final boolean timedOut;

        public ProcessResult(int exitCode, boolean timedOut) {
            this.exitCode = exitCode;
            this.timedOut = timedOut;
        }
    }
}
