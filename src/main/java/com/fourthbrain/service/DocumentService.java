package com.fourthbrain.service;

import com.fourthbrain.persistence.entity.Document;
import com.fourthbrain.persistence.repository.DocumentRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
public class DocumentService {

    @Autowired
    private DocumentRepository documentRepository;

    // Create
    public Document createDocument(String path, String content) {
        Document document = new Document(path, content);
        document.setUpdatedAt(LocalDateTime.now());
        Document saved = documentRepository.save(document);
        log.info("Document created: id={}, path={}", saved.getId(), saved.getPath());
        return saved;
    }

    public Document createDocument(Document document) {
        document.setCreatedAt(LocalDateTime.now());
        document.setUpdatedAt(LocalDateTime.now());
        if (document.getStatus() == null) {
            document.setStatus("New");
        }
        Document saved = documentRepository.save(document);
        log.info("Document created: id={}, status={}", saved.getId(), saved.getStatus());
        return saved;
    }

    // Read
    public Optional<Document> getDocumentById(Long id) {
        return documentRepository.findById(id);
    }

    public List<Document> getAllDocuments() {
        return documentRepository.findAll();
    }

    public List<Document> getDocumentsByStatus(String status) {
        return documentRepository.findByStatus(status);
    }

    public long getDocumentCountByStatus(String status) {
        return documentRepository.countByStatus(status);
    }

    // Update
    public Document updateDocument(Long id, Document updates) {
        Optional<Document> existing = documentRepository.findById(id);
        if (existing.isPresent()) {
            Document document = existing.get();
            if (updates.getPath() != null) document.setPath(updates.getPath());
            if (updates.getName() != null) document.setName(updates.getName());
            if (updates.getExtension() != null) document.setExtension(updates.getExtension());
            if (updates.getMimeType() != null) document.setMimeType(updates.getMimeType());
            if (updates.getContent() != null) document.setContent(updates.getContent());
            if (updates.getTopic() != null) document.setTopic(updates.getTopic());
            if (updates.getStatus() != null) document.setStatus(updates.getStatus());
            document.setUpdatedAt(LocalDateTime.now());
            Document saved = documentRepository.save(document);
            log.info("Document updated: id={}, status={}", saved.getId(), saved.getStatus());
            return saved;
        } else {
            log.warn("Document not found: id={}", id);
            return null;
        }
    }

    public Document updateDocumentStatus(Long id, String status) {
        Optional<Document> existing = documentRepository.findById(id);
        if (existing.isPresent()) {
            Document document = existing.get();
            String oldStatus = document.getStatus();
            document.setStatus(status);
            document.setUpdatedAt(LocalDateTime.now());
            Document saved = documentRepository.save(document);
            log.info("Document status updated: id={}, {} -> {}", id, oldStatus, status);
            return saved;
        } else {
            log.warn("Document not found: id={}", id);
            return null;
        }
    }

    // Delete
    public void deleteDocument(Long id) {
        documentRepository.deleteById(id);
        log.info("Document deleted: id={}", id);
    }

    public void deleteAllDocuments() {
        documentRepository.deleteAll();
        log.warn("All documents deleted");
    }
}
