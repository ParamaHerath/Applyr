package com.applyr.api.controller;

import com.applyr.api.entity.JobApplication;
import com.applyr.api.entity.User;
import com.applyr.api.entity.ApplicationStatus;
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

    /** Look up a single application by its public slug (e.g. "aB3k9xQwZ1p"). */
    @GetMapping("/{publicId}")
    public ResponseEntity<JobApplication> getApplicationByPublicId(
            @PathVariable String publicId, Authentication auth) {
        Optional<User> userOpt = getCurrentUser(auth);
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        return service.findByPublicId(publicId)
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
                    if (jobApplication.getStatus() == ApplicationStatus.DRAFT) {
                        jobApplication.setAppliedDate(null);
                    }
                    return ResponseEntity.ok(service.save(jobApplication));
                })
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @PutMapping("/{publicId}")
    public ResponseEntity<JobApplication> updateApplication(
            @PathVariable String publicId,
            @RequestBody JobApplication applicationDetails,
            Authentication auth) {
        Optional<User> userOpt = getCurrentUser(auth);
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        return service.findByPublicId(publicId)
                .filter(app -> app.getUser().getId().equals(userOpt.get().getId()))
                .map(application -> {
                    application.setCompanyName(applicationDetails.getCompanyName());
                    application.setRole(applicationDetails.getRole());
                    application.setJobLink(applicationDetails.getJobLink());
                    application.setStatus(applicationDetails.getStatus());
                    if (applicationDetails.getStatus() == ApplicationStatus.DRAFT) {
                        application.setAppliedDate(null);
                    } else {
                        application.setAppliedDate(applicationDetails.getAppliedDate());
                    }
                    application.setNotes(applicationDetails.getNotes());
                    application.setJobDescription(applicationDetails.getJobDescription());
                    application.setSalaryRange(applicationDetails.getSalaryRange());
                    application.setLocation(applicationDetails.getLocation());
                    application.setWorkType(applicationDetails.getWorkType());
                    application.setTechStacks(applicationDetails.getTechStacks());
                    return ResponseEntity.ok(service.save(application));
                }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{publicId}")
    public ResponseEntity<Void> deleteApplication(
            @PathVariable String publicId, Authentication auth) {
        Optional<User> userOpt = getCurrentUser(auth);
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Optional<JobApplication> appOpt = service.findByPublicId(publicId);
        if (appOpt.isPresent() && appOpt.get().getUser().getId().equals(userOpt.get().getId())) {
            service.deleteById(appOpt.get().getId());
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
