package com.fourthbrain.convert;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Component
@ConfigurationProperties(prefix = "fourthbrain.converter")
public class ConverterProperties {
    private String implementation = "markitdown";
    private boolean failFast = true;
    private List<String> supportedExtensions = List.of(
        "pdf", "docx", "doc", "pptx", "xlsx", "xls", "html", "htm", "epub", "msg", "csv", "json", "xml"
    );
    private List<String> passthroughExtensions = List.of("md", "markdown", "txt", "text");
    private int minOutputChars = 1;
    private long maxInputBytes = 104857600L; // 100 MiB
    private long maxOutputBytes = 33554432L; // 32 MiB
    private int maxConcurrentProcesses = 2;
    private MarkItDownProperties markitdown = new MarkItDownProperties();

    public static class MarkItDownProperties {
        private String executable = "";
        private String python = "";
        private String expectedVersion = "";
        private String versionCheck = "warn"; // off | warn | fail
        private Duration timeout = Duration.ofSeconds(120);
        private String workDir = "";
        private Map<String, String> env = Map.of(
            "PYTHONUTF8", "1",
            "PYTHONIOENCODING", "utf-8"
        );

        // Getters and setters
        public String getExecutable() { return executable; }
        public void setExecutable(String executable) { this.executable = executable; }

        public String getPython() { return python; }
        public void setPython(String python) { this.python = python; }

        public String getExpectedVersion() { return expectedVersion; }
        public void setExpectedVersion(String expectedVersion) { this.expectedVersion = expectedVersion; }

        public String getVersionCheck() { return versionCheck; }
        public void setVersionCheck(String versionCheck) { this.versionCheck = versionCheck; }

        public Duration getTimeout() { return timeout; }
        public void setTimeout(Duration timeout) { this.timeout = timeout; }

        public String getWorkDir() { return workDir; }
        public void setWorkDir(String workDir) { this.workDir = workDir; }

        public Map<String, String> getEnv() { return env; }
        public void setEnv(Map<String, String> env) { this.env = env; }
    }

    // Getters and setters
    public String getImplementation() { return implementation; }
    public void setImplementation(String implementation) { this.implementation = implementation; }

    public boolean isFailFast() { return failFast; }
    public void setFailFast(boolean failFast) { this.failFast = failFast; }

    public List<String> getSupportedExtensions() { return supportedExtensions; }
    public void setSupportedExtensions(List<String> supportedExtensions) { this.supportedExtensions = supportedExtensions; }

    public List<String> getPassthroughExtensions() { return passthroughExtensions; }
    public void setPassthroughExtensions(List<String> passthroughExtensions) { this.passthroughExtensions = passthroughExtensions; }

    public int getMinOutputChars() { return minOutputChars; }
    public void setMinOutputChars(int minOutputChars) { this.minOutputChars = minOutputChars; }

    public long getMaxInputBytes() { return maxInputBytes; }
    public void setMaxInputBytes(long maxInputBytes) { this.maxInputBytes = maxInputBytes; }

    public long getMaxOutputBytes() { return maxOutputBytes; }
    public void setMaxOutputBytes(long maxOutputBytes) { this.maxOutputBytes = maxOutputBytes; }

    public int getMaxConcurrentProcesses() { return maxConcurrentProcesses; }
    public void setMaxConcurrentProcesses(int maxConcurrentProcesses) { this.maxConcurrentProcesses = maxConcurrentProcesses; }

    public MarkItDownProperties getMarkitdown() { return markitdown; }
    public void setMarkitdown(MarkItDownProperties markitdown) { this.markitdown = markitdown; }
}
