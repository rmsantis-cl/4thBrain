package com.fourthbrain.convert;

public record ProbeResult(
    boolean available,
    String version,
    String detail
) {
    public ProbeResult(boolean available, String version, String detail) {
        this.available = available;
        this.version = version != null ? version : "";
        this.detail = detail != null ? detail : "";
    }
}
