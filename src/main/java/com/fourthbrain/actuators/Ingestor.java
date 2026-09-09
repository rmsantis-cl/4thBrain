package com.fourthbrain.actuators;

import com.fourthbrain.messaging.Message;
import com.fourthbrain.persistence.DatabaseService;
import com.fourthbrain.persistence.VaultArea;
import com.fourthbrain.persistence.VaultNaming;
import com.fourthbrain.persistence.entity.Document;
import com.fourthbrain.persistence.entity.DocumentCopy;
import com.fourthbrain.service.DocumentService;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

/**
 * The pipeline's first stage (Story P2.2, ADR29).
 * <p>
 * It is a queue consumer and nothing else: work arrives through
 * {@code Coordinator.startChain} or from the Extractor re-submitting an archive
 * member. It does not scan {@code $RAW_DIR} — that is Story P2.7's, and ADR29
 * decision 1 says so explicitly, because the story text used to ask for it.
 * <p>
 * Per document it does three things and then routes: it puts the document on
 * disk when it only exists in the database, archives the original into
 * {@code raw}, and checks that what the document claims to be is actually there.
 */
@Slf4j
public class Ingestor extends Actuator {

    private static final BlockingQueue<Message> ingestorQueue = new LinkedBlockingQueue<>();

    /** Extensions that read as text without needing a mime type to say so. */
    private static final List<String> TEXT_EXTENSIONS =
            List.of(".txt", ".md", ".markdown", ".html", ".htm", ".json", ".xml", ".csv", ".log");

    /** Archive formats; the Extractor expands these into one Document per member (P1.8). */
    private static final List<String> ARCHIVE_MIME_TYPES = List.of(
            "application/zip", "application/x-zip-compressed",
            "application/x-rar-compressed", "application/x-7z-compressed", "application/gzip");

    private static final List<String> ARCHIVE_EXTENSIONS = List.of(".zip", ".rar", ".7z", ".gz");

    /**
     * Formats that need converting to Markdown before anything downstream can read
     * them. ADR28 picked the converter; Story P2.9 builds it and P2.3 wires it in.
     * Until then these stop here with a warning rather than parking silently at an
     * Extractor that only unzips (ADR29 decision 5).
     */
    private static final List<String> CONVERTIBLE_MIME_TYPES = List.of(
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/epub+zip",
            "application/rtf",
            "application/vnd.oasis.opendocument.text");

    private static final List<String> CONVERTIBLE_EXTENSIONS = List.of(
            ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".epub", ".rtf", ".odt");

    @Value("${vault.tmp}")
    private String vaultTmpPath;

    @Value("${vault.raw}")
    private String vaultRawPath;

    @Value("${ingestor.archive-original:true}")
    private boolean archiveOriginal;

    @Value("${ingestor.max-name-length:60}")
    private int maxNameLength;

    @Value("${ingestor.default-extension:.md}")
    private String defaultExtension;

    @Autowired
    private DatabaseService databaseService;

    /**
     * Used only to persist name, extension and mime type after materialising a
     * captured note. Not for status: ADR26 decision 6 keeps status on the
     * synchronized DatabaseService, and the base class owns those writes anyway.
     */
    @Autowired
    private DocumentService documentService;

    public Ingestor() {
        super();
        log.info("Ingestor initialized");
    }

    @Override
    protected BlockingQueue<Message> getQueue() {
        return ingestorQueue;
    }

    @Override
    public String getGerund() {
        return "ingesting";
    }

    @Override
    public String getParticiple() {
        return "ingested";
    }

    @Override
    public String doTheThing(Document doc) {
        if (doc == null) {
            log.warn("Received null document");
            return null;
        }

        try {
            DocumentCopy tmpCopy = databaseService.findLive(doc.getId(), VaultArea.TMP);

            // A captured note exists only as a column until someone writes it out.
            if (tmpCopy == null && StringUtils.isNotBlank(doc.getContent())) {
                tmpCopy = materialise(doc);
            }

            if (!isUsable(doc, tmpCopy)) {
                return null;
            }

            if (tmpCopy != null) {
                archive(doc, tmpCopy);
            }

            String next = nextStage(doc);
            logIngested(doc, tmpCopy, next);
            return next;

        } catch (Exception e) {
            log.error("Error ingesting document: id={}", doc.getId(), e);
            return null;
        }
    }

    // ---- Step 1: put the document on disk ----

    /**
     * Writes a document that only has {@code content} out to {@code tmp} and records
     * the copy, so every stage downstream has a file to work with (ADR29 decision 2).
     */
    private DocumentCopy materialise(Document doc) throws IOException {
        Path tmpDir = Paths.get(vaultTmpPath);
        Files.createDirectories(tmpDir);

        String extension = StringUtils.defaultIfBlank(doc.getExtension(), defaultExtension);
        String fileName = VaultNaming.newName(tmpDir, baseNameFor(doc), extension);
        Path destination = tmpDir.resolve(fileName);

        // Explicit UTF-8: the platform default on a Windows JVM is usually not, and
        // the first note anyone types has an em dash or an accent in it.
        Files.write(destination, doc.getContent().getBytes(StandardCharsets.UTF_8));

        DocumentCopy copy = databaseService.addCopy(doc, VaultArea.TMP, destination.toString());

        // The document travels in the message (ADR26 decision 2), so the in-memory
        // instance has to carry these on to the next stage, not just the row.
        doc.setName(fileName);
        doc.setExtension(extension);
        if (StringUtils.isBlank(doc.getMimeType())) {
            doc.setMimeType("text/markdown");
        }
        persistMetadata(doc);

        log.info("Captured content written to disk: id={}, path={}, bytes={}",
                doc.getId(), destination, Files.size(destination));
        return copy;
    }

    /**
     * Only name, extension and mime type, passed as a fresh Document so
     * {@code updateDocument}'s non-null merge cannot write a stale status back over
     * the one the run loop just set.
     */
    private void persistMetadata(Document doc) {
        Document updates = Document.builder()
                .name(doc.getName())
                .extension(doc.getExtension())
                .mimeType(doc.getMimeType())
                .build();
        documentService.updateDocument(doc.getId(), updates);
    }

    /** The file name to give a captured note, without its extension. */
    private String baseNameFor(Document doc) {
        if (StringUtils.isNotBlank(doc.getName())) {
            return VaultNaming.baseOf(doc.getName().trim());
        }
        return slug(firstNonBlankLine(doc.getContent()));
    }

    private static String firstNonBlankLine(String content) {
        if (content == null) {
            return "";
        }
        for (String line : content.split("\\R")) {
            if (StringUtils.isNotBlank(line)) {
                return line.trim();
            }
        }
        return "";
    }

    /** Lowercased, non-alphanumerics collapsed to a dash, bounded, never empty. */
    private String slug(String text) {
        String slug = (text == null ? "" : text)
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-");

        int limit = (maxNameLength > 0) ? maxNameLength : 60;
        if (slug.length() > limit) {
            slug = slug.substring(0, limit);
        }
        slug = StringUtils.strip(slug, "-");

        return StringUtils.isBlank(slug) ? "note" : slug;
    }

    // ---- Step 2: archive the original ----

    /**
     * Copies — never moves — the live tmp file into {@code raw}. ADR28's failure
     * semantics assume the original survives a failed conversion, and tmp is what
     * the Extractor and the Indexer read from today.
     */
    private void archive(Document doc, DocumentCopy tmpCopy) throws IOException {
        if (!archiveOriginal) {
            return;
        }
        if (databaseService.findLive(doc.getId(), VaultArea.RAW) != null) {
            log.debug("Original already archived, skipping: id={}", doc.getId());
            return;
        }

        Path source = Paths.get(tmpCopy.getPath());
        Path rawDir = Paths.get(vaultRawPath);
        Files.createDirectories(rawDir);

        String fileName = source.getFileName().toString();
        Path destination = rawDir.resolve(
                VaultNaming.newName(rawDir, VaultNaming.baseOf(fileName), VaultNaming.extensionOf(fileName)));

        Files.copy(source, destination);
        databaseService.addCopy(doc, VaultArea.RAW, destination.toString());
        log.info("Original archived: id={}, path={}", doc.getId(), destination);
    }

    // ---- Step 3: validation ----

    /**
     * Whether there is anything here to process. Logs and returns false rather than
     * throwing: the run loop would catch a throw as "Main loop error" and stamp the
     * document {@code ingested} either way, with a worse message (ADR29 decision 6).
     */
    private boolean isUsable(Document doc, DocumentCopy tmpCopy) {
        if (tmpCopy != null) {
            Path path = Paths.get(tmpCopy.getPath());
            if (!Files.exists(path)) {
                log.error("Document claims a copy in {} but the file is gone: id={}, path={}",
                        VaultArea.TMP, doc.getId(), path);
                return false;
            }
            try {
                if (Files.size(path) == 0) {
                    log.warn("File is empty, nothing to ingest: id={}, path={}", doc.getId(), path);
                    return false;
                }
            } catch (IOException e) {
                log.error("Cannot read the file behind the copy: id={}, path={}", doc.getId(), path, e);
                return false;
            }
            return true;
        }

        if (StringUtils.isNotBlank(doc.getSourceUrl())) {
            // Nothing on disk yet on purpose: Clipper fetches it (ADR26 decision 5).
            return true;
        }

        log.warn("Nothing to ingest: id={} has no file, no content and no source URL", doc.getId());
        return false;
    }

    // ---- Step 4: routing (ADR29 decision 4) ----

    private String nextStage(Document doc) {
        if (isArchive(doc)) {
            log.info("Document is compressed - routing to Extractor: id={}", doc.getId());
            return "Extractor";
        }
        if (isUrl(doc)) {
            log.info("Document is URL - routing to Clipper: id={}", doc.getId());
            return "Clipper";
        }
        if (isTextContent(doc)) {
            // Indexer first, Classifier after it (BUG-005): the file is published
            // to the vault before it is given a topic and tags.
            log.info("Document is text - routing to Indexer: id={}", doc.getId());
            return "Indexer";
        }
        if (needsConversion(doc)) {
            log.warn("Document needs converting to Markdown and no converter is built yet "
                            + "(ADR28, Story P2.9); stopping here: id={}, mimeType={}, extension={}",
                    doc.getId(), doc.getMimeType(), doc.getExtension());
            return null;
        }
        if (StringUtils.isNotBlank(doc.getSourceUrl())) {
            log.warn("Source URL is not an http(s) URL and cannot be fetched: id={}, sourceUrl={}",
                    doc.getId(), doc.getSourceUrl());
            return null;
        }

        log.warn("Document type not recognized: id={}, mimeType={}, extension={}",
                doc.getId(), doc.getMimeType(), doc.getExtension());
        return null;
    }

    /** One line per document: what it was, how big, and where it went. */
    private void logIngested(Document doc, DocumentCopy tmpCopy, String next) {
        long size = -1;
        if (tmpCopy != null) {
            try {
                size = Files.size(Paths.get(tmpCopy.getPath()));
            } catch (IOException e) {
                log.debug("Could not size {}: {}", tmpCopy.getPath(), e.toString());
            }
        } else if (doc.getContent() != null) {
            size = doc.getContent().length();
        }

        log.info("Ingested doc={} name={} mimeType={} bytes={} next={}",
                doc.getId(), doc.getName(), doc.getMimeType(), size,
                (next == null) ? "none" : next);
    }

    // ---- Type predicates ----

    private boolean isArchive(Document doc) {
        String mimeType = lower(doc.getMimeType());
        if (StringUtils.isNotBlank(mimeType)) {
            return ARCHIVE_MIME_TYPES.contains(mimeType);
        }
        return ARCHIVE_EXTENSIONS.contains(lower(doc.getExtension()));
    }

    private boolean isUrl(Document doc) {
        // source_url is the field of record for a submitted URL (ADR26 decision 4).
        String sourceUrl = StringUtils.trimToNull(doc.getSourceUrl());
        if (sourceUrl == null) {
            return false;
        }
        try {
            URI uri = new URI(sourceUrl);
            String scheme = uri.getScheme();
            return uri.isAbsolute() && ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme));
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Text a downstream stage can read as-is. PDF is deliberately not here: it used
     * to be, which is how an unparsed PDF reached the Indexer and got written into
     * the vault as bytes (ADR29 decision 4).
     */
    private boolean isTextContent(Document doc) {
        String mimeType = lower(doc.getMimeType());
        if (StringUtils.isNotBlank(mimeType)) {
            return mimeType.startsWith("text/")
                    || mimeType.equals("application/json")
                    || mimeType.equals("application/xml");
        }
        return TEXT_EXTENSIONS.contains(lower(doc.getExtension()));
    }

    private boolean needsConversion(Document doc) {
        String mimeType = lower(doc.getMimeType());
        if (StringUtils.isNotBlank(mimeType) && CONVERTIBLE_MIME_TYPES.contains(mimeType)) {
            return true;
        }
        return CONVERTIBLE_EXTENSIONS.contains(lower(doc.getExtension()));
    }

    private static String lower(String value) {
        return (value == null) ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
