package com.fourthbrain.persistence;

/**
 * The vault areas a document copy can occupy, matching the paths configured
 * under {@code vault:} in application.yaml.
 * <p>
 * Story P1.8: a document may hold one live copy per area, never two in the
 * same area, so (documentId, area) identifies a copy uniquely.
 */
public final class VaultArea {

    /** Uploads and extracted files, before processing. */
    public static final String TMP = "tmp";

    /** Sanitized documents ready to be classified and indexed. */
    public static final String INCOMING = "incoming";

    /** Published documents, visible to Smart Connections. */
    public static final String INDEXING = "indexing";

    /** Archived originals. */
    public static final String RAW = "raw";

    private VaultArea() {
    }
}
