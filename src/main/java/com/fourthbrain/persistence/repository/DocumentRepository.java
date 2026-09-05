package com.fourthbrain.persistence.repository;

import com.fourthbrain.persistence.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    // Built-in CRUD: save(), findById(), findAll(), delete(), etc.

    // Custom queries
    @Query("SELECT d FROM Document d WHERE d.status = ?1")
    List<Document> findByStatus(String status);

    @Query("SELECT COUNT(d) FROM Document d WHERE d.status = ?1")
    long countByStatus(String status);
}
