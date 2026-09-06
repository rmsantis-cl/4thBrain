package com.fourthbrain.repo;

import com.fourthbrain.persistence.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, Integer> {

    List<Document> findByStatus(String status);

    long countByStatus(String status);
}
