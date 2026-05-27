package com.applyr.api.dto;

/**
 * Data Transfer Object for parsed job posting data.
 * Returned by the /api/parser/parse endpoint after extracting
 * structured data from a job posting URL.
 */
public class ParsedJobDto {

    private String title;
    private String company;
    private String location;
    private String salary;
    private String workType;
    private String techStacks;
    private String description;
    private String jobUrl;

    /** Which extraction method produced this data (JSON_LD, OPEN_GRAPH, HTML_SELECTORS, COMBINED). */
    private String source;

    public ParsedJobDto() {}

    // ── Getters & Setters ─────────────────────────────────────────────

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getCompany() { return company; }
    public void setCompany(String company) { this.company = company; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getSalary() { return salary; }
    public void setSalary(String salary) { this.salary = salary; }

    public String getWorkType() { return workType; }
    public void setWorkType(String workType) { this.workType = workType; }

    public String getTechStacks() { return techStacks; }
    public void setTechStacks(String techStacks) { this.techStacks = techStacks; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getJobUrl() { return jobUrl; }
    public void setJobUrl(String jobUrl) { this.jobUrl = jobUrl; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
}
