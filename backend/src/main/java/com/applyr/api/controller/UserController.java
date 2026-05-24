package com.applyr.api.controller;

import com.applyr.api.dto.UpdateProfileRequest;
import com.applyr.api.entity.User;
import com.applyr.api.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /** GET /api/users/me — returns the current user's public profile. */
    @GetMapping("/me")
    public ResponseEntity<?> getProfile(Authentication auth) {
        return resolveUser(auth)
                .map(user -> ResponseEntity.ok(Map.of(
                        "name", user.getName() != null ? user.getName() : "",
                        "email", user.getEmail()
                )))
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    /** PUT /api/users/me — updates name and/or password for the current user. */
    @PutMapping("/me")
    public ResponseEntity<?> updateProfile(@RequestBody UpdateProfileRequest req, Authentication auth) {
        Optional<User> userOpt = resolveUser(auth);
        if (userOpt.isEmpty()) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        User user = userOpt.get();

        // Update name if provided
        if (req.getName() != null && !req.getName().isBlank()) {
            user.setName(req.getName().trim());
        }

        // Update password only if both currentPassword and newPassword are provided
        if (req.getCurrentPassword() != null && req.getNewPassword() != null) {
            if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPassword())) {
                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST)
                        .body("Current password is incorrect");
            }
            if (req.getNewPassword().length() < 8) {
                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST)
                        .body("New password must be at least 8 characters");
            }
            user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        }

        User saved = userRepository.save(user);
        return ResponseEntity.ok(Map.of(
                "name", saved.getName() != null ? saved.getName() : "",
                "email", saved.getEmail()
        ));
    }

    private Optional<User> resolveUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) return Optional.empty();
        return userRepository.findByEmail(auth.getName());
    }
}
