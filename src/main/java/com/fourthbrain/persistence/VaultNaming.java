package com.fourthbrain.persistence;

import java.nio.file.Files;
import java.nio.file.Path;

/**
 * File naming for the vault areas.
 * <p>
 * Two documents that arrive with the same file name must not land on the same
 * path: the second write would replace the first on disk while the first's
 * {@code document_copy} row still pointed at it, so the row would describe
 * someone else's content. This holds the uniqueness loop that prevents that,
 * in one place, so an actuator does not have to reach into a controller for it.
 * <p>
 * The suffix goes on the base name, never after the extension:
 * {@code notes.md} becomes {@code notes_001.md}.
 */
public final class VaultNaming {

    private VaultNaming() {
    }

    /**
     * A name that does not yet exist in {@code directory}: {@code fileName}
     * itself when it is free, otherwise the base name with {@code _001},
     * {@code _002}, ... appended until one is.
     */
    public static String newName(Path directory, String fileName) {
        if (directory == null || fileName == null || fileName.isBlank()) {
            throw new IllegalArgumentException("directory and fileName cannot be null or blank");
        }

        if (!Files.exists(directory.resolve(fileName))) {
            return fileName;
        }

        int dot = fileName.lastIndexOf('.');
        String base = (dot > 0) ? fileName.substring(0, dot) : fileName;
        String extension = (dot > 0) ? fileName.substring(dot) : "";

        int counter = 1;
        while (true) {
            String candidate = String.format("%s_%03d%s", base, counter, extension);
            if (!Files.exists(directory.resolve(candidate))) {
                return candidate;
            }
            counter++;
        }
    }
}
