package com.applyr.api.controller;

import com.applyr.api.entity.JobApplication;
import com.applyr.api.entity.User;
import com.applyr.api.repository.UserRepository;
import com.applyr.api.service.JobApplicationService;
import com.applyr.api.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/applications")
public class JobApplicationController {

    @Autowired
    private JobApplicationService service;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    private Optional<User> getUserFromToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            String email = jwtUtil.extractEmail(token);
            return userRepository.findByEmail(email);
        }
        return Optional.empty();
    }

    @GetMapping
    public ResponseEntity<List<JobApplication>> getAllApplications(@RequestHeader("Authorization") String authHeader) {
        return getUserFromToken(authHeader)
                .map(user -> ResponseEntity.ok(service.findByUserId(user.getId())))
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobApplication> getApplicationById(@PathVariable Long id, @RequestHeader("Authorization") String authHeader) {
        Optional<User> userOpt = getUserFromToken(authHeader);
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        return service.findById(id)
                .filter(app -> app.getUser().getId().equals(userOpt.get().getId()))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<JobApplication> createApplication(@RequestBody JobApplication jobApplication, @RequestHeader("Authorization") String authHeader) {
        return getUserFromToken(authHeader)
                .map(user -> {
                    jobApplication.setUser(user);
                    return ResponseEntity.ok(service.save(jobApplication));
                })
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<JobApplication> updateApplication(@PathVariable Long id, @RequestBody JobApplication applicationDetails, @RequestHeader("Authorization") String authHeader) {
        Optional<User> userOpt = getUserFromToken(authHeader);
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        return service.findById(id)
                .filter(app -> app.getUser().getId().equals(userOpt.get().getId()))
                .map(application -> {
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
    public ResponseEntity<Void> deleteApplication(@PathVariable Long id, @RequestHeader("Authorization") String authHeader) {
        Optional<User> userOpt = getUserFromToken(authHeader);
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Optional<JobApplication> appOpt = service.findById(id);
        if (appOpt.isPresent() && appOpt.get().getUser().getId().equals(userOpt.get().getId())) {
            service.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
