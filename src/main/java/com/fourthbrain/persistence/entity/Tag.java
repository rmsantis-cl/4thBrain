package com.fourthbrain.persistence.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "tag")
public class Tag {

    @Id
    @Column
    private String name; // Primary key: tag name (e.g., "work", "personal", "urgent")

    @Column
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime endDate; // Soft delete: when the tag was end-dated (null if active)

    // Constructors
    public Tag() {
        this.createdAt = LocalDateTime.now();
    }

    public Tag(String name) {
        this();
        this.name = name;
    }

    // Getters and Setters
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
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
