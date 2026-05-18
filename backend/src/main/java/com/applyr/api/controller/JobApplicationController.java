package com.applyr.api.controller;

import com.applyr.api.entity.JobApplication;
import com.applyr.api.service.JobApplicationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/applications")
public class JobApplicationController {

    @Autowired
    private JobApplicationService service;

    @GetMapping
    public List<JobApplication> getAllApplications() {
        // For MVP, returning all. Later filter by logged-in user.
        return service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobApplication> getApplicationById(@PathVariable Long id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public JobApplication createApplication(@RequestBody JobApplication jobApplication) {
        return service.save(jobApplication);
    }

    @PutMapping("/{id}")
    public ResponseEntity<JobApplication> updateApplication(@PathVariable Long id, @RequestBody JobApplication applicationDetails) {
        return service.findById(id).map(application -> {
            application.setCompanyName(applicationDetails.getCompanyName());
            application.setRole(applicationDetails.getRole());
            application.setJobLink(applicationDetails.getJobLink());
            application.setStatus(applicationDetails.getStatus());
            application.setAppliedDate(applicationDetails.getAppliedDate());
            application.setNotes(applicationDetails.getNotes());
            return ResponseEntity.ok(service.save(application));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteApplication(@PathVariable Long id) {
        if (service.findById(id).isPresent()) {
            service.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
