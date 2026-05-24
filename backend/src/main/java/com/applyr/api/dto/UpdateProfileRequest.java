package com.applyr.api.dto;

/**
 * Request body for updating the current user's profile.
 * All fields are optional — only non-null values are applied.
 */
public class UpdateProfileRequest {

    private String name;

    /** Current password — required only when changing the password. */
    private String currentPassword;

    /** New password — only applied when currentPassword is also provided and correct. */
    private String newPassword;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCurrentPassword() { return currentPassword; }
    public void setCurrentPassword(String currentPassword) { this.currentPassword = currentPassword; }

    public String getNewPassword() { return newPassword; }
    public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
}
