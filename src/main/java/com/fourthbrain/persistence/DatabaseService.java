package com.fourthbrain.persistence;

import com.fourthbrain.persistence.entity.Document;
import com.fourthbrain.persistence.entity.DocumentCopy;
import com.fourthbrain.persistence.entity.Tag;
import com.fourthbrain.persistence.entity.DocumentTag;
import com.fourthbrain.persistence.repository.*;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Single synchronized service for all database writes.
 * All actuators use this service to write to the database,
 * ensuring strict concurrency control and serialized access.
 * Per ADR17: keep transactions brief (no long-running locks).
 */
@Service
public class DatabaseService {

    private static final Logger log = LoggerFactory.getLogger(DatabaseService.class);

    private final DocumentRepository documentRepository;
    private final TagRepository tagRepository;
    private final DocumentTagRepository documentTagRepository;
    private final DocumentCopyRepository documentCopyRepository;

    public DatabaseService(DocumentRepository documentRepository,
                          TagRepository tagRepository,
                          DocumentTagRepository documentTagRepository,
                          DocumentCopyRepository documentCopyRepository) {
        this.documentRepository = documentRepository;
        this.tagRepository = tagRepository;
        this.documentTagRepository = documentTagRepository;
        this.documentCopyRepository = documentCopyRepository;
    }

    // ---- Document operations ----

    public synchronized Document createDocument(String name, String content) {
        Document doc = new Document(name, content);
        return documentRepository.save(doc);
    }

    public synchronized Document create(Document doc) {
        return documentRepository.save(doc);
    }

    public synchronized Document updateDocumentStatus(Long documentId, String status) {
        Optional<Document> opt = documentRepository.findById(documentId);
        if (opt.isPresent()) {
            Document doc = opt.get();
            doc.setStatus(status);
            return documentRepository.save(doc);
        }
        return null;
    }

    public synchronized Document updateDocumentTopic(Long documentId, String topic) {
        Optional<Document> opt = documentRepository.findById(documentId);
        if (opt.isPresent()) {
            Document doc = opt.get();
            doc.setTopic(topic);
            return documentRepository.save(doc);
        }
        return null;
    }

    public Document getDocument(Long documentId) {
        return documentRepository.findById(documentId).orElse(null);
    }

    public List<Document> getDocumentsByStatus(String status) {
        return documentRepository.findByStatus(status);
    }

    public long countDocumentsByStatus(String status) {
        return documentRepository.countByStatus(status);
    }

    // ---- Document copy operations (Story P1.8) ----

    /**
     * The live copy of a document in one area, or null if it has none there.
     */
    public DocumentCopy findLive(long documentId, String area) {
        return documentCopyRepository.findLive(documentId, area).orElse(null);
    }

    /** Every live copy of a document, across areas. */
    public List<DocumentCopy> findLive(long documentId) {
        return documentCopyRepository.findLive(documentId);
    }

    /** Full location history, retired copies included. */
    public List<DocumentCopy> findCopyHistory(long documentId) {
        return documentCopyRepository.findHistory(documentId);
    }

    public synchronized DocumentCopy addCopy(Document doc, String area, String path) {
        if (doc == null || doc.getId() == null) {
            throw new IllegalArgumentException("Document must be persisted before it can hold a copy");
        }
        return addCopy(doc.getId(), area, path);
    }

    /**
     * Records a copy of a document in an area. If that area already holds a
     * live copy, it is retired first: a file was overwritten at that location,
     * so the old row no longer describes anything on disk. This is what keeps
     * the P1.8 invariant of one live copy per area.
     */
    public synchronized DocumentCopy addCopy(Long documentId, String area, String path) {
        if (documentId == null) {
            throw new IllegalArgumentException("Document id cannot be null");
        }
        if (area == null || area.isBlank()) {
            throw new IllegalArgumentException("Area cannot be null or blank");
        }
        if (path == null || path.isBlank()) {
            throw new IllegalArgumentException("Path cannot be null or blank");
        }

        documentCopyRepository.findLive(documentId, area).ifPresent(existing -> {
            log.debug("Area {} already holds a live copy of doc={}, retiring copy={}",
                    area, documentId, existing.getCopyId());
            retire(existing);
        });

        DocumentCopy copy = DocumentCopy.builder()
                .documentId(documentId)
                .area(area)
                .path(path)
                .createdAt(LocalDateTime.now())
                .build();

        DocumentCopy saved = documentCopyRepository.save(copy);
        log.info("Copy added: doc={} area={} copy={} path={}", documentId, area, saved.getCopyId(), path);
        return saved;
    }

    /** Marks a copy as no longer present on disk. The row is kept. */
    public synchronized DocumentCopy retire(DocumentCopy copy) {
        if (copy == null) {
            throw new IllegalArgumentException("Copy cannot be null");
        }
        if (!copy.isLive()) {
            log.debug("Copy already retired: copy={}", copy.getCopyId());
            return copy;
        }
        copy.setEndDate(LocalDateTime.now());
        DocumentCopy saved = documentCopyRepository.save(copy);
        log.info("Copy retired: doc={} area={} copy={}",
                copy.getDocumentId(), copy.getArea(), copy.getCopyId());
        return saved;
    }

    /**
     * Moves the file behind a copy into another area: the file is relocated,
     * the source copy retired, and a new copy recorded at the destination.
     */
    public synchronized DocumentCopy move(DocumentCopy source, String toArea, String newPath) throws IOException {
        if (source == null) {
            throw new IllegalArgumentException("Source copy cannot be null");
        }
        if (newPath == null || newPath.isBlank()) {
            throw new IllegalArgumentException("New path cannot be null or blank");
        }

        String currentPath = source.getPath();

        try {
            Path from = Paths.get(currentPath);
            Path to = Paths.get(newPath);

            if (Files.exists(from)) {
                if (to.getParent() != null) {
                    Files.createDirectories(to.getParent());
                }
                Files.move(from, to, StandardCopyOption.REPLACE_EXISTING);
                log.info("File moved from {} to {}", currentPath, newPath);
            } else {
                log.warn("Source file does not exist: {}", currentPath);
            }

            retire(source);
            DocumentCopy moved = addCopy(source.getDocumentId(), toArea, newPath);

            documentRepository.findById(source.getDocumentId()).ifPresent(doc -> {
                doc.setUpdatedAt(LocalDateTime.now());
                documentRepository.save(doc);
            });

            return moved;
        } catch (IOException e) {
            log.error("Error moving file from {} to {}: {}", currentPath, newPath, e.getMessage());
            throw e;
        }
    }

    // ---- Tag operations ----

    public synchronized Tag createTag(String tagName) {
        Tag tag = new Tag(tagName);
        return tagRepository.save(tag);
    }

    public synchronized Tag endDateTag(String tagName) {
        Optional<Tag> opt = tagRepository.findById(tagName);
        if (opt.isPresent()) {
            Tag tag = opt.get();
            tag.setEndDate(java.time.LocalDateTime.now());
            return tagRepository.save(tag);
        }
        return null;
    }

    public Tag getTag(String tagName) {
        return tagRepository.findById(tagName).orElse(null);
    }

    public List<Tag> getActiveTags() {
        return tagRepository.findActive();
    }

    // ---- DocumentTag operations ----

    public synchronized DocumentTag linkDocumentToTag(Long documentId, String tagName) {
        DocumentTag dt = new DocumentTag(documentId, tagName);
        return documentTagRepository.save(dt);
    }

    public synchronized DocumentTag endDateDocumentTag(Long documentTagId) {
        Optional<DocumentTag> opt = documentTagRepository.findById(documentTagId);
        if (opt.isPresent()) {
            DocumentTag dt = opt.get();
            dt.setEndDate(java.time.LocalDateTime.now());
            return documentTagRepository.save(dt);
        }
        return null;
    }

    public List<DocumentTag> getActiveTagsByDocumentId(Long documentId) {
        return documentTagRepository.findActiveTagsByDocumentId(documentId);
    }

    public List<DocumentTag> getActiveDocumentsByTagName(String tagName) {
        return documentTagRepository.findActiveDocumentsByTagName(tagName);
    }

    public long countActiveTagsByDocumentId(Long documentId) {
        return documentTagRepository.countActiveTagsByDocumentId(documentId);
    }
}
