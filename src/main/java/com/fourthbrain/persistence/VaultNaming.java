package com.fourthbrain.persistence;

import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Picks a file name that is free in a vault directory.
 * <p>
 * The loop is the one {@code IngestionController.newName} has always used —
 * try the name, then {@code name_001}, {@code name_002} and so on — lifted out
 * of the controller so an actuator can reach it without calling into the web
 * layer. The controller keeps its own copy for now; the two converge later.
 * <p>
 * The one difference: the extension is carried through the loop rather than
 * appended to its result. Checking {@code notes} for existence and then writing
 * {@code notes.md} means the second note with the same first line silently
 * overwrites the first.
 */
public final class VaultNaming {

    private VaultNaming() {
    }

    /** A free name in {@code path}, treating {@code prefix} as the whole file name. */
    public static String newName(Path path, String prefix) {
        return newName(path, prefix, "");
    }

    /**
     * A free file name in {@code path}, built as {@code prefix + extension} and
     * counting up until nothing is in the way.
     *
     * @param path      the directory the name has to be free in
     * @param prefix    the name without its extension
     * @param extension the extension, leading dot included, or null/empty for none
     * @return the file name, extension included
     */
    public static String newName(Path path, String prefix, String extension) {
        if (path == null || prefix == null) {
            throw new IllegalArgumentException("path and prefix cannot be null");
        }

        String suffix = (extension == null) ? "" : extension;

        String candidate = prefix + suffix;
        if (!Files.exists(path.resolve(candidate))) {
            return candidate;
        }

        int counter = 1;
        while (true) {
            candidate = String.format("%s_%03d%s", prefix, counter, suffix);
            if (!Files.exists(path.resolve(candidate))) {
                return candidate;
            }
            counter++;
        }
    }

    /** The part of a file name before its extension: {@code notes.txt} gives {@code notes}. */
    public static String baseOf(String fileName) {
        int dot = dotIndex(fileName);
        return (dot < 0) ? fileName : fileName.substring(0, dot);
    }

    /** The extension of a file name, leading dot included, or "" when it has none. */
    public static String extensionOf(String fileName) {
        int dot = dotIndex(fileName);
        return (dot < 0) ? "" : fileName.substring(dot);
    }

    /** Index of the extension's dot, or -1. A leading or trailing dot is not one. */
    private static int dotIndex(String fileName) {
        if (fileName == null) {
            return -1;
        }
        int dot = fileName.lastIndexOf('.');
        return (dot > 0 && dot < fileName.length() - 1) ? dot : -1;
    }
}
