package com.fourthbrain.persistence.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "document_tag")
public class DocumentTag {

    // See Document: SQLite requires INTEGER for a rowid alias, not BIGINT.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(columnDefinition = "INTEGER")
    private Long id;

    @Column(nullable = false, columnDefinition = "INTEGER")
    private Long documentId;

    @Column(nullable = false)
    private String tagName; // Foreign key to Tag.name

    @Column
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime endDate; // Soft delete

    // Constructors
    public DocumentTag() {
        this.createdAt = LocalDateTime.now();
    }

    public DocumentTag(Long documentId, String tagName) {
        this();
        this.documentId = documentId;
        this.tagName = tagName;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getDocumentId() {
        return documentId;
    }

    public void setDocumentId(Long documentId) {
        this.documentId = documentId;
    }

    public String getTagName() {
        return tagName;
    }

    public void setTagName(String tagName) {
        this.tagName = tagName;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDateTime endDate) {
        this.endDate = endDate;
    }

    public boolean isActive() {
        return endDate == null;
    }
}
