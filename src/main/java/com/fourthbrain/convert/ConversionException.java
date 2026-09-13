package com.fourthbrain.convert;

public class ConversionException extends Exception {
    public enum Reason {
        UNAVAILABLE,
        UNSUPPORTED_FORMAT,
        TOO_LARGE,
        TIMEOUT,
        CONVERTER_FAILED,
        EMPTY_RESULT,
        OUTPUT_TOO_LARGE,
        IO_ERROR
    }

    private final Reason reason;
    private final String detail;

    public ConversionException(Reason reason, String message) {
        super(message);
        this.reason = reason;
        this.detail = message;
    }

    public ConversionException(Reason reason, String message, Throwable cause) {
        super(message, cause);
        this.reason = reason;
        this.detail = message;
    }

    public Reason getReason() {
        return reason;
    }

    public String getDetail() {
        return detail;
    }
}
