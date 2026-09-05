package com.fourthbrain.repo;

import com.fourthbrain.persistence.entity.Document;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;
import com.fourthbrain.persistence.repository.DocumentRepository as JpaDocumentRepository;
import java.util.List;
import java.util.Optional;

@Repository
@Slf4j
public class DocumentRepository {

    @Autowired
    private JpaDocumentRepository jpaRepository;

    // Create
    public Document save(Document document) {
        Document saved = jpaRepository.save(document);
        log.debug("Document saved: id={}", saved.getId());
        return saved;
    }

    // Read
    public Optional<Document> findById(Long id) {
        return jpaRepository.findById(id);
    }

    public List<Document> findAll() {
        return jpaRepository.findAll();
    }

    public List<Document> findByStatus(String status) {
        return jpaRepository.findByStatus(status);
    }

    public long countByStatus(String status) {
        return jpaRepository.countByStatus(status);
    }

    // Update
    public Document update(Document document) {
        return jpaRepository.save(document);
    }

    // Delete
    public void deleteById(Long id) {
        jpaRepository.deleteById(id);
        log.debug("Document deleted: id={}", id);
    }

    public void delete(Document document) {
        jpaRepository.delete(document);
    }

    public void deleteAll() {
        jpaRepository.deleteAll();
        log.warn("All documents deleted");
    }

    // Additional utility methods
    public boolean existsById(Long id) {
        return jpaRepository.existsById(id);
    }

    public long count() {
        return jpaRepository.count();
    }
}
