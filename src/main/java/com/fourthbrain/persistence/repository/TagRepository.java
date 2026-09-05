package com.fourthbrain.persistence.repository;

import com.fourthbrain.persistence.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TagRepository extends JpaRepository<Tag, String> {

    // Built-in CRUD: save(), findById(name), findAll(), delete(), etc.

    // Custom queries
    @Query("SELECT t FROM Tag t WHERE t.endDate IS NULL")
    List<Tag> findActive();
}
