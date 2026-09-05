package com.fourthbrain.persistence;

import com.fourthbrain.persistence.entity.Document;
import com.fourthbrain.persistence.entity.Tag;
import com.fourthbrain.persistence.entity.DocumentTag;
import com.fourthbrain.persistence.repository.*;
import org.springframework.stereotype.Service;
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

    private final DocumentRepository documentRepository;
    private final TagRepository tagRepository;
    private final DocumentTagRepository documentTagRepository;

    public DatabaseService(DocumentRepository documentRepository,
                          TagRepository tagRepository,
                          DocumentTagRepository documentTagRepository) {
        this.documentRepository = documentRepository;
        this.tagRepository = tagRepository;
        this.documentTagRepository = documentTagRepository;
    }

    // ---- Document operations ----

    public synchronized Document createDocument(String path, String content) {
        Document doc = new Document(path, content);
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
