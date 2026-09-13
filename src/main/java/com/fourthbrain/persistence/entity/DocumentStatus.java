package com.fourthbrain.persistence.entity;

public enum DocumentStatus {
    // Pipeline stages
    NEW("New"),
    INGESTING("Ingesting"),
    INGESTED("Ingested"),
    EXTRACTING("Extracting"),
    EXTRACTED("Extracted"),
    CLASSIFYING("Classifying"),
    CLASSIFIED("Classified"),
    INDEXING("Indexing"),
    INDEXED("Indexed"),

    // Extraction failure states (per P2.9 story)
    EXTRACTION_UNSUPPORTED("ExtractionUnsupported"),
    EXTRACTION_EMPTY("ExtractionEmpty"),
    EXTRACTION_FAILED("ExtractionFailed"),

    // General failure states
    FAILED("Failed");

    private final String value;

    DocumentStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static DocumentStatus fromValue(String value) {
        for (DocumentStatus status : DocumentStatus.values()) {
            if (status.value.equals(value)) {
                return status;
            }
        }
        throw new IllegalArgumentException("Unknown status: " + value);
    }
}
