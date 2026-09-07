package com.fourthbrain.persistence.repository;

import com.fourthbrain.persistence.entity.DocumentTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DocumentTagRepository extends JpaRepository<DocumentTag, Long> {

    // Built-in CRUD: save(), findById(), findAll(), delete(), etc.

    // Custom queries
    @Query("SELECT dt FROM DocumentTag dt WHERE dt.documentId = ?1 AND dt.endDate IS NULL")
    List<DocumentTag> findActiveTagsByDocumentId(Long documentId);

    @Query("SELECT dt FROM DocumentTag dt WHERE dt.tagName = ?1 AND dt.endDate IS NULL")
    List<DocumentTag> findActiveDocumentsByTagName(String tagName);

    @Query("SELECT COUNT(dt) FROM DocumentTag dt WHERE dt.documentId = ?1 AND dt.endDate IS NULL")
    long countActiveTagsByDocumentId(Long documentId);
}
