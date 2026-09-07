package com.fourthbrain.persistence.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

@Entity
@Table(name = "document")
@Data
@Builder
@AllArgsConstructor 
public class Document {

    // SQLite only treats a column as a rowid alias when it is declared
    // exactly INTEGER PRIMARY KEY, so the id columns cannot be BIGINT.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(columnDefinition = "INTEGER")
    private Long id;

    @Column(columnDefinition = "INTEGER")
    private Long parentId;

    @Column
    private String name;

    @Column
    private String extension;

    @Column
    private String mimeType;

    @Column(columnDefinition = "TEXT")
    private String content;

    /** Where clipped content was fetched from. Not a file location. */
    @Column
    private String sourceUrl;

    @Column
    private String topic;

    @Column
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime updatedAt;

    @Column
    private String status; // "New", "Processing", "Indexed", "Failed"

    // Constructors
    public Document() {
        this.createdAt = LocalDateTime.now();
        this.status = "New";
    }

    public Document(String name, String content) {
        this();
        this.name = name;
        this.content = content;
    }

    public Long id() {
        return id;
    }

}
