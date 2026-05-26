package com.applyr.api.controller;

import com.applyr.api.dto.ParsedJobDto;
import com.applyr.api.service.JobParserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * REST controller for parsing job posting URLs.
 * <p>
 * Endpoint: {@code POST /api/parser/parse} with body {@code { "url": "..." }}
 * <p>
 * Includes simple in-memory rate limiting (5 requests per minute per user).
 */
@RestController
@RequestMapping("/api/parser")
public class JobParserController {

    private static final Logger log = LoggerFactory.getLogger(JobParserController.class);

    @Autowired
    private JobParserService parserService;

    // ── Simple in-memory rate limiter ────────────────────────────────────────────
    private static final int MAX_REQUESTS_PER_MINUTE = 5;
    private static final long WINDOW_MS = 60_000; // 1 minute

    /**
     * Tracks parse request timestamps per user for rate-limiting.
     * Key: user email, Value: array of timestamps (circular buffer approach).
     */
    private final ConcurrentHashMap<String, long[]> rateLimitMap = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Integer> rateLimitIndex = new ConcurrentHashMap<>();

    /**
     * Parses a job posting URL and returns extracted fields.
     *
     * @param body    JSON body with a "url" field
     * @param auth    the authenticated user's security context
     * @return ParsedJobDto with extracted fields, or an error response
     */
    @PostMapping("/parse")
    public ResponseEntity<?> parseJobUrl(
            @RequestBody Map<String, String> body,
            Authentication auth) {

        String userEmail = auth != null ? auth.getName() : "anonymous";

        // ── Rate limit check ─────────────────────────────────────────────
        if (!checkRateLimit(userEmail)) {
            log.warn("Rate limit exceeded for user: {}", userEmail);
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of(
                        "error", "Rate limit exceeded",
                        "message", "You can parse up to " + MAX_REQUESTS_PER_MINUTE +
                                   " URLs per minute. Please wait and try again."
                    ));
        }

        // ── Validate URL ─────────────────────────────────────────────────
        String url = body.get("url");
        if (url == null || url.trim().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                        "error", "Missing URL",
                        "message", "Please provide a job posting URL to parse."
                    ));
        }

        url = url.trim();

        // Validate URL format
        try {
            URL parsed = new URL(url);
            String protocol = parsed.getProtocol();
            if (!"http".equals(protocol) && !"https".equals(protocol)) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                            "error", "Invalid URL",
                            "message", "Only HTTP and HTTPS URLs are supported."
                        ));
            }
        } catch (MalformedURLException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                        "error", "Invalid URL",
                        "message", "The provided URL is not valid. Please check and try again."
                    ));
        }

        // ── Parse ────────────────────────────────────────────────────────
        try {
            ParsedJobDto result = parserService.parse(url);

            // Check if we got meaningful data
            if (isBlank(result.getTitle()) && isBlank(result.getCompany()) && isBlank(result.getDescription())) {
                return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                        .body(Map.of(
                            "error", "Parse failed",
                            "message", "We couldn't extract job details from this page. " +
                                       "The site may be blocking automated access, or the page " +
                                       "structure isn't supported yet. Please enter details manually."
                        ));
            }

            return ResponseEntity.ok(result);

        } catch (IOException e) {
            log.error("Failed to fetch URL '{}': {}", url, e.getMessage());

            String userMessage;
            if (e.getMessage() != null && e.getMessage().contains("Status=403")) {
                userMessage = "This website is blocking our access. " +
                              "Some sites (like LinkedIn) restrict automated parsing. " +
                              "Please enter the details manually.";
            } else if (e.getMessage() != null && e.getMessage().contains("Status=404")) {
                userMessage = "The job posting page was not found. " +
                              "The listing may have been removed or the URL is incorrect.";
            } else if (e.getMessage() != null &&
                       (e.getMessage().contains("connect timed out") || e.getMessage().contains("Read timed out"))) {
                userMessage = "The website took too long to respond. Please try again in a moment.";
            } else {
                userMessage = "We couldn't access this page. Please check the URL and try again, " +
                              "or enter the details manually.";
            }

            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of(
                        "error", "Fetch failed",
                        "message", userMessage
                    ));
        } catch (Exception e) {
            log.error("Unexpected error parsing URL '{}': {}", url, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                        "error", "Internal error",
                        "message", "An unexpected error occurred while parsing. Please try again or enter details manually."
                    ));
        }
    }

    // ── Rate Limiter Implementation ──────────────────────────────────────────────

    /**
     * Returns true if the request is within the rate limit, false otherwise.
     * Uses a circular buffer of timestamps per user.
     */
    private boolean checkRateLimit(String userEmail) {
        long now = System.currentTimeMillis();

        long[] timestamps = rateLimitMap.computeIfAbsent(userEmail,
                k -> new long[MAX_REQUESTS_PER_MINUTE]);
        Integer idx = rateLimitIndex.computeIfAbsent(userEmail, k -> 0);

        // Check if the oldest entry in the window is still within the time frame
        long oldest = timestamps[idx];
        if (oldest != 0 && (now - oldest) < WINDOW_MS) {
            return false; // Rate limited
        }

        // Record this request
        timestamps[idx] = now;
        rateLimitIndex.put(userEmail, (idx + 1) % MAX_REQUESTS_PER_MINUTE);

        return true;
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
