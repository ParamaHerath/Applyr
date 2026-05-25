package com.applyr.api.repository;

import com.applyr.api.entity.JobApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {
    List<JobApplication> findByUserId(Long userId);
    Optional<JobApplication> findByPublicId(String publicId);
}
