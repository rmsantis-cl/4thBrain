package com.fourthbrain.persistence.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.*;

/**
 * One physical location a document occupies.
 * <p>
 * Story P1.8: replaces Document.path. A copy is live while {@code endDate} is
 * null and is retired by stamping it, never by deleting the row, so a
 * document's location history survives.
 */
@Entity
@Table(name = "document_copy")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentCopy {

    // See Document: SQLite requires INTEGER for a rowid alias, not BIGINT.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(columnDefinition = "INTEGER")
    private Long copyId;

    @Column(nullable = false, columnDefinition = "INTEGER")
    private Long documentId;

    @Column(nullable = false)
    private String path;

    /** One of the constants in {@link com.fourthbrain.persistence.VaultArea}. */
    @Column(nullable = false)
    private String area;

    @Column
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime endDate;

    public boolean isLive() {
        return endDate == null;
    }
}
