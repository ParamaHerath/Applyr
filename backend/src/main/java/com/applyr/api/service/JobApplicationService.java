package com.applyr.api.service;

import com.applyr.api.entity.JobApplication;
import com.applyr.api.repository.JobApplicationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class JobApplicationService {

    @Autowired
    private JobApplicationRepository repository;

    public List<JobApplication> findAll() {
        return repository.findAll();
    }

    public List<JobApplication> findByUserId(Long userId) {
        return repository.findByUserId(userId);
    }

    public Optional<JobApplication> findById(Long id) {
        return repository.findById(id);
    }

    public JobApplication save(JobApplication jobApplication) {
        return repository.save(jobApplication);
    }

    public void deleteById(Long id) {
        repository.deleteById(id);
    }
}
