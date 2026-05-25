package com.applyr.api.service;

import com.applyr.api.entity.JobApplication;
import com.applyr.api.repository.JobApplicationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class JobApplicationService {

    @Autowired
    private JobApplicationRepository repository;

    public List<JobApplication> findAll() {
        return repository.findAll();
    }

    public List<JobApplication> findByUserId(Long userId) {
        List<JobApplication> apps = repository.findByUserId(userId);

        // Heal any existing rows that pre-date the publicId column
        List<JobApplication> toHeal = apps.stream()
                .filter(app -> app.getPublicId() == null)
                .collect(Collectors.toList());
        if (!toHeal.isEmpty()) {
            toHeal.forEach(JobApplication::ensurePublicId);
            repository.saveAll(toHeal);
        }

        return apps;
    }

    public Optional<JobApplication> findById(Long id) {
        return repository.findById(id);
    }

    public Optional<JobApplication> findByPublicId(String publicId) {
        return repository.findByPublicId(publicId);
    }

    public JobApplication save(JobApplication jobApplication) {
        return repository.save(jobApplication);
    }

    public void deleteById(Long id) {
        repository.deleteById(id);
    }
}
