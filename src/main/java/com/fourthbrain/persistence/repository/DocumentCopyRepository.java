package com.fourthbrain.persistence.repository;

import com.fourthbrain.persistence.entity.DocumentCopy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentCopyRepository extends JpaRepository<DocumentCopy, Long> {

    /**
     * The live copy of a document in one area. Single-valued by the P1.8
     * invariant: a document never holds two live copies in the same area.
     */
    @Query("SELECT c FROM DocumentCopy c WHERE c.documentId = ?1 AND c.area = ?2 AND c.endDate IS NULL")
    Optional<DocumentCopy> findLive(Long documentId, String area);

    /** Every live copy of a document, across areas. */
    @Query("SELECT c FROM DocumentCopy c WHERE c.documentId = ?1 AND c.endDate IS NULL")
    List<DocumentCopy> findLive(Long documentId);

    /** Full location history, retired copies included, oldest first. */
    @Query("SELECT c FROM DocumentCopy c WHERE c.documentId = ?1 ORDER BY c.createdAt")
    List<DocumentCopy> findHistory(Long documentId);
}
