package com.fourthbrain.persistence.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime
import lombok.*;

@Entity
@Table(name = "document")
@Data
@NoArgsConstructor
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String path;

    @Column
    private String name;

    @Column
    private String extension;

    @Column
    private String mimeType;

    @Column(columnDefinition = "TEXT")
    private String content;

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

    public Document(String path, String content) {
        this();
        this.path = path;
        this.content = content;
    }

}
