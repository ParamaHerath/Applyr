package com.applyr.api.controller;

import com.applyr.api.entity.JobApplication;
import com.applyr.api.entity.User;
import com.applyr.api.repository.UserRepository;
import com.applyr.api.service.JobApplicationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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

    /**
     * Resolves the currently authenticated user from the SecurityContext.
     * The JwtAuthenticationFilter has already validated the token by this point —
     * the Authentication principal is the user's email.
     */
    private Optional<User> getCurrentUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) return Optional.empty();
        return userRepository.findByEmail(auth.getName());
    }

    @GetMapping
    public ResponseEntity<List<JobApplication>> getAllApplications(Authentication auth) {
        return getCurrentUser(auth)
                .map(user -> ResponseEntity.ok(service.findByUserId(user.getId())))
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobApplication> getApplicationById(@PathVariable Long id, Authentication auth) {
        Optional<User> userOpt = getCurrentUser(auth);
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        return service.findById(id)
                .filter(app -> app.getUser().getId().equals(userOpt.get().getId()))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<JobApplication> createApplication(
            @RequestBody JobApplication jobApplication,
            Authentication auth) {
        return getCurrentUser(auth)
                .map(user -> {
                    jobApplication.setUser(user);
                    return ResponseEntity.ok(service.save(jobApplication));
                })
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<JobApplication> updateApplication(
            @PathVariable Long id,
            @RequestBody JobApplication applicationDetails,
            Authentication auth) {
        Optional<User> userOpt = getCurrentUser(auth);
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
    public ResponseEntity<Void> deleteApplication(@PathVariable Long id, Authentication auth) {
        Optional<User> userOpt = getCurrentUser(auth);
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Optional<JobApplication> appOpt = service.findById(id);
        if (appOpt.isPresent() && appOpt.get().getUser().getId().equals(userOpt.get().getId())) {
            service.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
