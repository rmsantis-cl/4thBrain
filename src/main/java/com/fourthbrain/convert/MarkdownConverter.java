package com.fourthbrain.convert;

import java.nio.file.Path;

public interface MarkdownConverter {

    /**
     * Convert source to Markdown. Never returns null, never returns blank.
     */
    String convert(Path source, String extensionHint) throws ConversionException;

    /**
     * True if this converter will attempt extensionHint (no leading dot, case-insensitive).
     */
    boolean supports(String extensionHint);

    /**
     * Cheap enough to call at startup, expensive enough to be worth calling.
     */
    ProbeResult probe();
}
