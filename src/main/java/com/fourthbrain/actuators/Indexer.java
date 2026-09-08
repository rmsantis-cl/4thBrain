package com.fourthbrain.actuators;

import com.fourthbrain.messaging.Message;
import com.fourthbrain.persistence.DatabaseService;
import com.fourthbrain.persistence.VaultArea;
import com.fourthbrain.persistence.VaultNaming;
import com.fourthbrain.persistence.entity.Document;
import com.fourthbrain.persistence.entity.DocumentCopy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

/**
 * Final stage: puts the document into the indexing area of the vault.
 * <p>
 * Story P2.5, Part A. The indexing directory is watched by something outside
 * this application, so the file has to appear complete or not at all: the
 * bytes are written to a {@code .part} sibling and renamed into place, which
 * is atomic within one directory. Nothing here calls
 * {@link DatabaseService#move}, which replaces an existing destination without
 * saying so.
 */
@Slf4j
public class Indexer extends Actuator {

    private static final BlockingQueue<Message> indexerQueue = new LinkedBlockingQueue<>();

    @Value("${vault.indexing}")
    private String vaultIndexingPath;

    /**
     * The area the Indexer picks its source copy up from. It is tmp today,
     * because uploads land there and Ingestor routes straight on; it becomes
     * incoming once Extractor writes sanitized output (P2.3). Configured so
     * that shift is a config change, not a code change.
     */
    @Value("${vault.indexer.source-area}")
    private String sourceArea;

    /**
     * Whether a document that has content but no file is written out here.
     * A note typed into the composer has no copy row of its own, so without
     * this it would reach the last stage of the pipeline and stop.
     */
    @Value("${indexer.materialise-content:true}")
    private boolean materialiseContent;

    @Autowired
    private DatabaseService databaseService;

    public Indexer() {
        super();
        log.info("Indexer initialized");
    }

    @Override
    protected BlockingQueue<Message> getQueue() {
        return indexerQueue;
    }

    @Override
    public String getGerund() {
        return "indexing";
    }

    @Override
    public String getParticiple() {
        return "indexed";
    }

    @Override
    public String doTheThing(Document doc) {
        if (doc == null) {
            log.warn("Received null document");
            return null;
        }

        log.debug("Indexing document: id={}", doc.getId());

        Path vaultIndexing = Paths.get(vaultIndexingPath);
        try {
            Files.createDirectories(vaultIndexing);
        } catch (IOException e) {
            // Reads as a configuration problem because that is what it is:
            // vault.indexing points somewhere this process cannot write.
            log.error("Indexing directory cannot be created: path={} (check vault.indexing), doc={}",
                    vaultIndexing, doc.getId(), e);
            return null;
        }

        DocumentCopy source = databaseService.findLive(doc.getId(), sourceArea);
        if (source == null) {
            return materialise(doc, vaultIndexing);
        }
        return moveIntoVault(doc, source, vaultIndexing);
    }

    /** The normal path: a file exists in the source area and is relocated. */
    private String moveIntoVault(Document doc, DocumentCopy source, Path vaultIndexing) {
        Path sourcePath = Paths.get(source.getPath());
        if (!Files.exists(sourcePath)) {
            // The row is a claim about the disk and the disk is authoritative.
            log.error("Source copy points at a file that is gone: doc={}, area={}, path={}",
                    doc.getId(), sourceArea, sourcePath);
            return null;
        }

        String sourceName = sourcePath.getFileName().toString();
            String destName = VaultNaming.newName(vaultIndexing, VaultNaming.baseOf(sourceName), VaultNaming.extensionOf(sourceName));
        Path dest = vaultIndexing.resolve(destName);
        Path part = vaultIndexing.resolve(destName + ".part");

        try {
            Files.copy(sourcePath, part, StandardCopyOption.REPLACE_EXISTING);
            publish(part, dest);
        } catch (IOException e) {
            log.error("Error indexing document: doc={}, from={}, to={}", doc.getId(), sourcePath, dest, e);
            discard(part);
            return null;
        }

        try {
            Files.deleteIfExists(sourcePath);
        } catch (IOException e) {
            // The file is already in the vault; the source is now a leftover.
            log.warn("Indexed copy is in place but the source file could not be removed: doc={}, path={}",
                    doc.getId(), sourcePath, e);
        }

        // addCopy before retire: a crash between them leaves two live copies,
        // which reads as "the file is in both places". Losing the row for a
        // file that exists is the worse direction to be wrong in.
        databaseService.addCopy(doc, VaultArea.INDEXING, dest.toString());
        databaseService.retire(source);

        logIndexed(doc, dest, "moved from " + sourceArea);
        return null;
    }

    /**
     * A document carrying its text but no file of its own — a note captured
     * through the composer. Written straight into the indexing area rather
     * than dropped, which is what happened before P2.5.
     */
    private String materialise(Document doc, Path vaultIndexing) {
        String content = doc.getContent();
        if (!materialiseContent || content == null || content.isBlank()) {
            log.warn("No live copy in area {} for document: id={}", sourceArea, doc.getId());
            return null;
        }

        String targetName = fileNameFor(doc);
            String destName = VaultNaming.newName(vaultIndexing, VaultNaming.baseOf(targetName), VaultNaming.extensionOf(targetName));
        Path dest = vaultIndexing.resolve(destName);
        Path part = vaultIndexing.resolve(destName + ".part");

        try {
            Files.write(part, content.getBytes(StandardCharsets.UTF_8));
            publish(part, dest);
        } catch (IOException e) {
            log.error("Error indexing document: doc={}, from=content, to={}", doc.getId(), dest, e);
            discard(part);
            return null;
        }

        databaseService.addCopy(doc, VaultArea.INDEXING, dest.toString());
        logIndexed(doc, dest, "materialised from content");
        return null;
    }

    /**
     * Renames a fully written {@code .part} file into place. A rename within
     * one directory is atomic on every filesystem this runs on; the fallback
     * is for the day the vault sits on a network share or another drive.
     */
    private void publish(Path part, Path dest) throws IOException {
        try {
            Files.move(part, dest, StandardCopyOption.ATOMIC_MOVE);
        } catch (AtomicMoveNotSupportedException e) {
            log.warn("Atomic move unavailable for {}; falling back to a replacing move, "
                    + "so a watcher may see this file part-written", dest);
            Files.move(part, dest, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    /** Removes a half-written file so nothing outside ever reads it. */
    private void discard(Path part) {
        try {
            Files.deleteIfExists(part);
        } catch (IOException e) {
            log.warn("Could not remove the partial file {}", part, e);
        }
    }

    /** The name a content-only document takes on disk. Markdown unless it already carries an extension. */
    private String fileNameFor(Document doc) {
        String name = doc.getName();
        if (name == null || name.isBlank()) {
            return "note.md";
        }
        // Nothing downstream should be able to steer a write out of the vault.
        String bare = Paths.get(name).getFileName().toString();
        if (bare.isBlank() || bare.equals(".") || bare.equals("..")) {
            return "note.md";
        }
        return bare.lastIndexOf('.') > 0 ? bare : bare + ".md";
    }

    /**
     * The one line anyone debugging this stage reads. No indexing timestamp is
     * written to the document: {@code document_copy.created_at} on the indexing
     * row already records when it arrived, which is what P1.8 built it for.
     */
    private void logIndexed(Document doc, Path dest, String how) {
        long bytes = -1;
        try {
            bytes = Files.size(dest);
        } catch (IOException e) {
            log.debug("Could not size {}", dest, e);
        }
        log.info("Indexed doc={} topic={} {} -> {} bytes={}",
                doc.getId(), doc.getTopic(), how, dest, bytes);
    }
}
