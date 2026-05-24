package com.applyr.api.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Component
public class JwtUtil {

    /**
     * Signing key, injected from application.properties / JWT_SECRET env var.
     * The value must be a Base64-encoded string of at least 32 bytes (256 bits) for HS256.
     */
    @Value("${jwt.secret}")
    private String secret;

    /**
     * Token lifetime in milliseconds, injected from application.properties / JWT_EXPIRATION_MS env var.
     * Default: 86400000 (24 hours).
     */
    @Value("${jwt.expiration-ms}")
    private long expirationMs;

    // Derive the signing Key lazily from the injected base64 secret.
    private Key getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secret);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    // ── Token generation ──────────────────────────────────────────────────────

    public String generateToken(String email) {
        Map<String, Object> claims = new HashMap<>();
        return buildToken(claims, email);
    }

    private String buildToken(Map<String, Object> extraClaims, String subject) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .setClaims(extraClaims)
                .setSubject(subject)
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + expirationMs))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    // ── Token validation ──────────────────────────────────────────────────────

    /**
     * Returns true only if the token is signed with the current key,
     * has not expired, and its subject matches the expected email.
     */
    public boolean validateToken(String token, String expectedEmail) {
        try {
            String subject = extractEmail(token);
            return subject.equals(expectedEmail) && !isTokenExpired(token);
        } catch (JwtException | IllegalArgumentException e) {
            // Covers: expired tokens, wrong signature, malformed tokens, etc.
            return false;
        }
    }

    /**
     * Extracts the subject (email) from a token.
     * Throws JwtException if the token is invalid or expired.
     */
    public String extractEmail(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }
}
