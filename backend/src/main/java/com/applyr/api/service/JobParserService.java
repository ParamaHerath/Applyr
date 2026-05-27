package com.applyr.api.service;

import com.applyr.api.dto.ParsedJobDto;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Parses job posting URLs using a 3-tier extraction strategy:
 * <ol>
 *   <li><b>JSON-LD</b> — Schema.org JobPosting structured data (highest reliability)</li>
 *   <li><b>Open Graph / Meta tags</b> — og:title, og:description, etc. (broad fallback)</li>
 *   <li><b>Site-specific HTML selectors</b> — targeted CSS selectors for popular ATS/job boards</li>
 * </ol>
 *
 * Fields are merged across tiers: if JSON-LD provides title + company but not location,
 * the service fills location from OG tags or HTML selectors.
 */
@Service
public class JobParserService {

    private static final Logger log = LoggerFactory.getLogger(JobParserService.class);

    private static final String USER_AGENT = "ApplyrJobParser/1.0 (+https://github.com/ParamaHerath/Applyr)";
    private static final int CONNECT_TIMEOUT_MS = 10_000;
    private static final int READ_TIMEOUT_MS = 15_000;

    // ── Common technology keywords for tech-stack extraction ──────────────────
    private static final Set<String> TECH_KEYWORDS = Set.of(
        // Languages
        "Java", "Python", "JavaScript", "TypeScript", "Go", "Rust", "C++", "C#",
        "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R", "Dart", "Elixir", "Clojure",
        "Perl", "Haskell", "Lua", "MATLAB", "Groovy", "Objective-C",
        // Frontend
        "React", "Angular", "Vue", "Vue.js", "Svelte", "Next.js", "Nuxt", "Gatsby",
        "HTML", "CSS", "SASS", "SCSS", "Tailwind", "TailwindCSS", "Bootstrap",
        "jQuery", "Ember", "Backbone", "Remix", "Astro", "Solid.js",
        // Backend
        "Node.js", "Express", "Spring", "Spring Boot", "Django", "Flask", "FastAPI",
        "Rails", "Ruby on Rails", "Laravel", "ASP.NET", ".NET", "NestJS", "Gin",
        "Fiber", "Echo", "Actix", "Rocket", "Phoenix", "Ktor",
        // Databases
        "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "DynamoDB",
        "Cassandra", "SQLite", "MariaDB", "Oracle", "SQL Server", "CouchDB",
        "Neo4j", "InfluxDB", "Supabase", "Firebase", "Firestore",
        // Cloud & DevOps
        "AWS", "Azure", "GCP", "Google Cloud", "Docker", "Kubernetes", "Terraform",
        "Jenkins", "CircleCI", "GitHub Actions", "GitLab CI", "ArgoCD", "Ansible",
        "Pulumi", "Helm", "Vagrant", "Packer", "CloudFormation",
        // Data & ML
        "TensorFlow", "PyTorch", "Pandas", "NumPy", "Spark", "Hadoop", "Kafka",
        "Airflow", "dbt", "Snowflake", "BigQuery", "Databricks", "MLflow",
        "Scikit-learn", "Keras", "Hugging Face", "LangChain", "OpenAI",
        // Tools
        "Git", "GitHub", "GitLab", "Bitbucket", "Jira", "Confluence",
        "Figma", "Storybook", "Webpack", "Vite", "Babel", "ESLint",
        "Prettier", "Jest", "Cypress", "Playwright", "Selenium",
        // Mobile
        "React Native", "Flutter", "SwiftUI", "Jetpack Compose", "Xamarin",
        "Ionic", "Capacitor",
        // Messaging & APIs
        "GraphQL", "REST", "gRPC", "RabbitMQ", "SQS", "SNS", "NATS",
        "WebSocket", "Apollo", "Prisma", "Sequelize", "Hibernate",
        // Monitoring & Observability
        "Datadog", "Grafana", "Prometheus", "New Relic", "Sentry", "Splunk", "ELK",
        "PagerDuty", "Kibana", "Jaeger", "OpenTelemetry"
    );

    // Case-insensitive lookup map for matching
    private static final Map<String, String> TECH_KEYWORD_MAP;

    static {
        TECH_KEYWORD_MAP = new HashMap<>();
        for (String keyword : TECH_KEYWORDS) {
            TECH_KEYWORD_MAP.put(keyword.toLowerCase(), keyword);
        }
    }

    // ── Salary patterns ──────────────────────────────────────────────────────────
    private static final Pattern SALARY_PATTERN = Pattern.compile(
        "(?i)(?:\\$|USD|EUR|€|£|GBP|CAD|AUD)\\s*[\\d,]+(?:\\.\\d{1,2})?(?:k)?\\s*(?:-|–|to)\\s*(?:\\$|USD|EUR|€|£|GBP|CAD|AUD)?\\s*[\\d,]+(?:\\.\\d{1,2})?(?:k)?(?:\\s*(?:per\\s+(?:year|annum|month|hr|hour)|\\/(?:yr|mo|hr)))?|" +
        "[\\d,]+(?:\\.\\d{1,2})?(?:k)?\\s*(?:-|–|to)\\s*[\\d,]+(?:\\.\\d{1,2})?(?:k)?\\s*(?:\\$|USD|EUR|€|£|GBP|CAD|AUD)(?:\\s*(?:per\\s+(?:year|annum|month|hr|hour)|\\/(?:yr|mo|hr)))?|" +
        "(?:\\$|USD|EUR|€|£|GBP|CAD|AUD)\\s*[\\d,]+(?:\\.\\d{1,2})?(?:k)?(?:\\s*(?:per\\s+(?:year|annum|month|hr|hour)|\\/(?:yr|mo|hr)))?",
        Pattern.CASE_INSENSITIVE
    );

    // ── Public API ────────────────────────────────────────────────────────────────

    /**
     * Parses a job posting URL and returns extracted fields.
     *
     * @param url the URL of the job posting page
     * @return ParsedJobDto with as many fields filled as possible
     * @throws IOException if the page cannot be fetched
     */
    public ParsedJobDto parse(String url) throws IOException {
        log.info("Parsing job URL: {}", url);

        Document doc = Jsoup.connect(url)
                .userAgent(USER_AGENT)
                .timeout(CONNECT_TIMEOUT_MS)
                .maxBodySize(5 * 1024 * 1024) // 5 MB limit
                .followRedirects(true)
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .header("Accept-Language", "en-US,en;q=0.9")
                .get();

        ParsedJobDto result = new ParsedJobDto();
        result.setJobUrl(url);

        List<String> sources = new ArrayList<>();

        // ── Tier 1: JSON-LD ──────────────────────────────────────────────
        boolean jsonLdFound = extractFromJsonLd(doc, result);
        if (jsonLdFound) {
            sources.add("JSON_LD");
            log.info("JSON-LD extraction successful");
        }

        // ── Tier 2: Open Graph / Meta tags ───────────────────────────────
        boolean ogFound = extractFromMetaTags(doc, result);
        if (ogFound) {
            sources.add("OPEN_GRAPH");
            log.info("Open Graph / Meta tag extraction successful");
        }

        // ── Tier 3: Site-specific HTML selectors ─────────────────────────
        boolean htmlFound = extractFromHtmlSelectors(doc, url, result);
        if (htmlFound) {
            sources.add("HTML_SELECTORS");
            log.info("HTML selector extraction successful");
        }

        // ── Post-processing ──────────────────────────────────────────────
        postProcess(doc, result);

        // Set source info
        if (sources.isEmpty()) {
            result.setSource("NONE");
        } else if (sources.size() == 1) {
            result.setSource(sources.get(0));
        } else {
            result.setSource("COMBINED");
        }

        log.info("Parse complete — title='{}', company='{}', source={}",
                result.getTitle(), result.getCompany(), result.getSource());

        return result;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  TIER 1: JSON-LD Extraction
    // ══════════════════════════════════════════════════════════════════════════════

    private boolean extractFromJsonLd(Document doc, ParsedJobDto result) {
        Elements scripts = doc.select("script[type=application/ld+json]");
        if (scripts.isEmpty()) return false;

        boolean foundJobPosting = false;

        for (Element script : scripts) {
            try {
                String jsonText = script.html().trim();
                if (jsonText.isEmpty()) continue;

                JsonElement root = JsonParser.parseString(jsonText);
                JsonObject jobPosting = findJobPosting(root);

                if (jobPosting != null) {
                    foundJobPosting = true;
                    extractFieldsFromJobPosting(jobPosting, result);
                }
            } catch (Exception e) {
                log.debug("Failed to parse JSON-LD block: {}", e.getMessage());
            }
        }

        return foundJobPosting;
    }

    /**
     * Recursively searches for a JobPosting object in JSON-LD,
     * handling @graph arrays and nested structures.
     */
    private JsonObject findJobPosting(JsonElement element) {
        if (element.isJsonObject()) {
            JsonObject obj = element.getAsJsonObject();
            String type = getJsonString(obj, "@type");
            if ("JobPosting".equalsIgnoreCase(type)) {
                return obj;
            }
            // Check @graph array
            if (obj.has("@graph")) {
                JsonObject found = findJobPosting(obj.get("@graph"));
                if (found != null) return found;
            }
        } else if (element.isJsonArray()) {
            JsonArray arr = element.getAsJsonArray();
            for (JsonElement item : arr) {
                JsonObject found = findJobPosting(item);
                if (found != null) return found;
            }
        }
        return null;
    }

    private void extractFieldsFromJobPosting(JsonObject jp, ParsedJobDto result) {
        // Title
        if (isBlank(result.getTitle())) {
            result.setTitle(getJsonString(jp, "title"));
        }

        // Company (hiringOrganization)
        if (isBlank(result.getCompany())) {
            if (jp.has("hiringOrganization")) {
                JsonElement ho = jp.get("hiringOrganization");
                if (ho.isJsonObject()) {
                    result.setCompany(getJsonString(ho.getAsJsonObject(), "name"));
                } else if (ho.isJsonPrimitive()) {
                    result.setCompany(ho.getAsString());
                }
            }
        }

        // Location (jobLocation)
        if (isBlank(result.getLocation())) {
            result.setLocation(extractLocationFromJsonLd(jp));
        }

        // Description
        if (isBlank(result.getDescription())) {
            String desc = getJsonString(jp, "description");
            if (!isBlank(desc)) {
                result.setDescription(cleanHtml(desc));
            }
        }

        // Salary (baseSalary)
        if (isBlank(result.getSalary())) {
            result.setSalary(extractSalaryFromJsonLd(jp));
        }

        // Employment type → work type
        if (isBlank(result.getWorkType())) {
            String empType = getJsonString(jp, "employmentType");
            if (!isBlank(empType)) {
                result.setWorkType(normalizeWorkType(empType));
            }
            // Also check jobLocationType for TELECOMMUTE
            String locationType = getJsonString(jp, "jobLocationType");
            if ("TELECOMMUTE".equalsIgnoreCase(locationType)) {
                result.setWorkType("Remote");
            }
        }

        // Skills / qualifications
        if (isBlank(result.getTechStacks())) {
            String skills = getJsonString(jp, "skills");
            if (!isBlank(skills)) {
                result.setTechStacks(skills);
            }
            // Also check qualifications
            if (isBlank(result.getTechStacks())) {
                String qualifications = getJsonString(jp, "qualifications");
                if (!isBlank(qualifications)) {
                    result.setTechStacks(extractTechFromText(cleanHtml(qualifications)));
                }
            }
        }
    }

    private String extractLocationFromJsonLd(JsonObject jp) {
        if (!jp.has("jobLocation")) return null;

        JsonElement locEl = jp.get("jobLocation");
        List<String> locations = new ArrayList<>();

        if (locEl.isJsonArray()) {
            for (JsonElement item : locEl.getAsJsonArray()) {
                String loc = parseSingleLocation(item);
                if (loc != null) locations.add(loc);
            }
        } else {
            String loc = parseSingleLocation(locEl);
            if (loc != null) locations.add(loc);
        }

        return locations.isEmpty() ? null : String.join(" / ", locations);
    }

    private String parseSingleLocation(JsonElement locEl) {
        if (!locEl.isJsonObject()) return null;
        JsonObject loc = locEl.getAsJsonObject();

        // Check for address sub-object
        if (loc.has("address")) {
            JsonElement addrEl = loc.get("address");
            if (addrEl.isJsonObject()) {
                JsonObject addr = addrEl.getAsJsonObject();
                String city = getJsonString(addr, "addressLocality");
                String region = getJsonString(addr, "addressRegion");
                String country = getJsonString(addr, "addressCountry");
                // addressCountry can be an object
                if (isBlank(country) && addr.has("addressCountry") && addr.get("addressCountry").isJsonObject()) {
                    country = getJsonString(addr.get("addressCountry").getAsJsonObject(), "name");
                }

                StringBuilder sb = new StringBuilder();
                if (!isBlank(city)) sb.append(city);
                if (!isBlank(region)) {
                    if (sb.length() > 0) sb.append(", ");
                    sb.append(region);
                }
                if (!isBlank(country)) {
                    if (sb.length() > 0) sb.append(", ");
                    sb.append(country);
                }
                if (sb.length() > 0) return sb.toString();
            }
        }

        // Fallback: check name or description directly on the location object
        String name = getJsonString(loc, "name");
        if (!isBlank(name)) return name;

        return getJsonString(loc, "description");
    }

    private String extractSalaryFromJsonLd(JsonObject jp) {
        if (!jp.has("baseSalary")) return null;

        JsonElement salaryEl = jp.get("baseSalary");
        if (!salaryEl.isJsonObject()) return null;

        JsonObject salary = salaryEl.getAsJsonObject();
        String currency = getJsonString(salary, "currency");
        if (isBlank(currency)) currency = "USD";

        String currencySymbol = switch (currency.toUpperCase()) {
            case "USD" -> "$";
            case "EUR" -> "€";
            case "GBP" -> "£";
            case "CAD" -> "CA$";
            case "AUD" -> "A$";
            default -> currency + " ";
        };

        // Check for value sub-object (QuantitativeValue or MonetaryAmount)
        if (salary.has("value")) {
            JsonElement valueEl = salary.get("value");
            if (valueEl.isJsonObject()) {
                JsonObject value = valueEl.getAsJsonObject();
                String minVal = getJsonString(value, "minValue");
                String maxVal = getJsonString(value, "maxValue");
                String exactVal = getJsonString(value, "value");
                String unitText = getJsonString(value, "unitText");

                String suffix = "";
                if ("YEAR".equalsIgnoreCase(unitText)) suffix = "/yr";
                else if ("MONTH".equalsIgnoreCase(unitText)) suffix = "/mo";
                else if ("HOUR".equalsIgnoreCase(unitText)) suffix = "/hr";

                if (!isBlank(minVal) && !isBlank(maxVal)) {
                    return currencySymbol + formatSalaryNumber(minVal) + " - " +
                           currencySymbol + formatSalaryNumber(maxVal) + suffix;
                } else if (!isBlank(exactVal)) {
                    return currencySymbol + formatSalaryNumber(exactVal) + suffix;
                }
            } else if (valueEl.isJsonPrimitive()) {
                return currencySymbol + formatSalaryNumber(valueEl.getAsString());
            }
        }

        return null;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  TIER 2: Open Graph & Meta Tag Extraction
    // ══════════════════════════════════════════════════════════════════════════════

    private boolean extractFromMetaTags(Document doc, ParsedJobDto result) {
        boolean found = false;

        // Title from OG or standard meta
        if (isBlank(result.getTitle())) {
            String ogTitle = getMeta(doc, "og:title");
            if (!isBlank(ogTitle)) {
                // OG titles often include company name like "Software Engineer at Google"
                String[] parts = ogTitle.split("\\s+(?:at|@|\\||-|–|—|·)\\s+");
                if (parts.length >= 2) {
                    result.setTitle(parts[0].trim());
                    if (isBlank(result.getCompany())) {
                        result.setCompany(parts[parts.length - 1].trim());
                    }
                } else {
                    result.setTitle(ogTitle.trim());
                }
                found = true;
            }
        }

        // Company from OG site name
        if (isBlank(result.getCompany())) {
            String siteName = getMeta(doc, "og:site_name");
            if (!isBlank(siteName)) {
                result.setCompany(siteName.trim());
                found = true;
            }
        }

        // Description from OG or standard meta
        if (isBlank(result.getDescription())) {
            String ogDesc = getMeta(doc, "og:description");
            if (isBlank(ogDesc)) {
                ogDesc = doc.select("meta[name=description]").attr("content");
            }
            if (!isBlank(ogDesc)) {
                result.setDescription(cleanHtml(ogDesc));
                found = true;
            }
        }

        // Try to get title from the HTML <title> tag as a last resort
        if (isBlank(result.getTitle())) {
            String pageTitle = doc.title();
            if (!isBlank(pageTitle)) {
                // Clean common suffixes like " | Company" or " - Company - Job Board"
                String cleaned = pageTitle.split("\\s*[|–—]\\s*")[0].trim();
                if (!isBlank(cleaned) && cleaned.length() > 3) {
                    result.setTitle(cleaned);
                    found = true;
                }
            }
        }

        return found;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  TIER 3: Site-Specific HTML Selector Extraction
    // ══════════════════════════════════════════════════════════════════════════════

    private boolean extractFromHtmlSelectors(Document doc, String url, ParsedJobDto result) {
        String host = "";
        try {
            host = new java.net.URL(url).getHost().toLowerCase();
        } catch (Exception e) {
            return false;
        }

        if (host.contains("greenhouse.io") || host.contains("boards.greenhouse.io")) {
            return extractGreenhouse(doc, result);
        } else if (host.contains("lever.co") || host.contains("jobs.lever.co")) {
            return extractLever(doc, result);
        } else if (host.contains("linkedin.com")) {
            return extractLinkedIn(doc, result);
        } else if (host.contains("indeed.com")) {
            return extractIndeed(doc, result);
        } else if (host.contains("myworkdayjobs.com") || host.contains("workday.com")) {
            return extractWorkday(doc, result);
        } else if (host.contains("ashbyhq.com") || host.contains("jobs.ashbyhq.com")) {
            return extractAshby(doc, result);
        } else if (host.contains("smartrecruiters.com")) {
            return extractSmartRecruiters(doc, result);
        } else if (host.contains("workable.com")) {
            return extractWorkable(doc, result);
        } else if (host.contains("breezy.hr")) {
            return extractBreezy(doc, result);
        } else if (host.contains("icims.com")) {
            return extractICIMS(doc, result);
        } else if (host.contains("jobvite.com")) {
            return extractJobvite(doc, result);
        }

        // Generic fallback: try common patterns used by many career pages
        return extractGenericHtml(doc, result);
    }

    // ── Greenhouse ───────────────────────────────────────────────────────────────

    private boolean extractGreenhouse(Document doc, ParsedJobDto result) {
        boolean found = false;

        if (isBlank(result.getTitle())) {
            String title = textFrom(doc, ".app-title, h1.posting-headline, h1");
            if (!isBlank(title)) { result.setTitle(title); found = true; }
        }
        if (isBlank(result.getCompany())) {
            String company = textFrom(doc, ".company-name, span.company-name");
            if (!isBlank(company)) { result.setCompany(company); found = true; }
        }
        if (isBlank(result.getLocation())) {
            String location = textFrom(doc, ".location, .body--metadata--location");
            if (!isBlank(location)) { result.setLocation(location); found = true; }
        }
        if (isBlank(result.getDescription())) {
            String desc = textFrom(doc, "#content, .content, #job-content");
            if (!isBlank(desc)) { result.setDescription(desc); found = true; }
        }

        return found;
    }

    // ── Lever ────────────────────────────────────────────────────────────────────

    private boolean extractLever(Document doc, ParsedJobDto result) {
        boolean found = false;

        if (isBlank(result.getTitle())) {
            String title = textFrom(doc, ".posting-headline h2, h2[data-qa=posting-name]");
            if (!isBlank(title)) { result.setTitle(title); found = true; }
        }
        if (isBlank(result.getLocation())) {
            String location = textFrom(doc, ".posting-categories .location, .posting-category.location, .sort-by-commit .location");
            if (!isBlank(location)) { result.setLocation(location); found = true; }
        }
        if (isBlank(result.getWorkType())) {
            String commitment = textFrom(doc, ".posting-categories .commitment, .posting-category.commitment");
            if (!isBlank(commitment)) {
                result.setWorkType(normalizeWorkType(commitment));
                found = true;
            }
        }
        if (isBlank(result.getDescription())) {
            String desc = textFrom(doc, ".posting-page .content, [data-qa=posting-description]");
            if (!isBlank(desc)) { result.setDescription(desc); found = true; }
        }

        return found;
    }

    // ── LinkedIn ─────────────────────────────────────────────────────────────────

    private boolean extractLinkedIn(Document doc, ParsedJobDto result) {
        boolean found = false;

        if (isBlank(result.getTitle())) {
            String title = textFrom(doc,
                ".top-card-layout__title, " +
                ".topcard__title, " +
                "h1.t-24, " +
                "h2.top-card-layout__title, " +
                "h1");
            if (!isBlank(title)) { result.setTitle(title); found = true; }
        }
        if (isBlank(result.getCompany())) {
            String company = textFrom(doc,
                ".topcard__org-name-link, " +
                ".top-card-layout__company-name, " +
                "a.topcard__org-name-link, " +
                ".topcard__flavor--black-link");
            if (!isBlank(company)) { result.setCompany(company.trim()); found = true; }
        }
        if (isBlank(result.getLocation())) {
            String location = textFrom(doc,
                ".topcard__flavor--bullet, " +
                ".top-card-layout__bullet, " +
                "span.topcard__flavor--bullet");
            if (!isBlank(location)) { result.setLocation(location.trim()); found = true; }
        }
        if (isBlank(result.getDescription())) {
            String desc = textFrom(doc,
                ".description__text, " +
                ".show-more-less-html__markup, " +
                ".core-section-container__content");
            if (!isBlank(desc)) { result.setDescription(desc); found = true; }
        }

        return found;
    }

    // ── Indeed ────────────────────────────────────────────────────────────────────

    private boolean extractIndeed(Document doc, ParsedJobDto result) {
        boolean found = false;

        if (isBlank(result.getTitle())) {
            String title = textFrom(doc,
                "h1.jobsearch-JobInfoHeader-title, " +
                "h1[data-testid=jobsearch-JobInfoHeader-title], " +
                ".jobsearch-JobInfoHeader-title-container h1");
            if (!isBlank(title)) { result.setTitle(title); found = true; }
        }
        if (isBlank(result.getCompany())) {
            String company = textFrom(doc,
                "[data-company-name], " +
                "div.jobsearch-InlineCompanyRating a, " +
                ".jobsearch-CompanyInfoContainer a");
            if (!isBlank(company)) { result.setCompany(company.trim()); found = true; }
        }
        if (isBlank(result.getLocation())) {
            String location = textFrom(doc,
                "[data-testid=job-location], " +
                "div.jobsearch-JobInfoHeader-subtitle > div:last-child, " +
                ".jobsearch-JobInfoHeader-subtitle .companyLocation");
            if (!isBlank(location)) { result.setLocation(location.trim()); found = true; }
        }
        if (isBlank(result.getDescription())) {
            String desc = textFrom(doc, "#jobDescriptionText, .jobsearch-jobDescriptionText");
            if (!isBlank(desc)) { result.setDescription(desc); found = true; }
        }
        if (isBlank(result.getSalary())) {
            String salary = textFrom(doc,
                "#salaryInfoAndJobType .salary-snippet, " +
                "[data-testid=attribute_snippet_testid], " +
                ".jobsearch-JobMetadataHeader-item");
            if (!isBlank(salary) && salary.matches(".*\\d.*")) {
                result.setSalary(salary.trim());
                found = true;
            }
        }

        return found;
    }

    // ── Workday ──────────────────────────────────────────────────────────────────

    private boolean extractWorkday(Document doc, ParsedJobDto result) {
        boolean found = false;

        if (isBlank(result.getTitle())) {
            String title = textFrom(doc,
                "[data-automation-id=jobPostingHeader] h2, " +
                ".css-req-title, " +
                "h2[data-automation-id=jobTitle]");
            if (!isBlank(title)) { result.setTitle(title); found = true; }
        }
        if (isBlank(result.getLocation())) {
            String location = textFrom(doc,
                "[data-automation-id=locations], " +
                "[data-automation-id=jobPostingLocation], " +
                ".css-location");
            if (!isBlank(location)) { result.setLocation(location.trim()); found = true; }
        }
        if (isBlank(result.getDescription())) {
            String desc = textFrom(doc,
                "[data-automation-id=jobPostingDescription], " +
                ".css-job-description");
            if (!isBlank(desc)) { result.setDescription(desc); found = true; }
        }

        return found;
    }

    // ── Ashby ────────────────────────────────────────────────────────────────────

    private boolean extractAshby(Document doc, ParsedJobDto result) {
        boolean found = false;

        if (isBlank(result.getTitle())) {
            String title = textFrom(doc,
                "h1.ashby-job-posting-brief-title, " +
                "h1[class*=JobPostingBrief], " +
                "h1");
            if (!isBlank(title)) { result.setTitle(title); found = true; }
        }
        if (isBlank(result.getLocation())) {
            String location = textFrom(doc,
                ".ashby-job-posting-location, " +
                "p[class*=location], " +
                "[class*=LocationLabel]");
            if (!isBlank(location)) { result.setLocation(location.trim()); found = true; }
        }
        if (isBlank(result.getCompany())) {
            String company = textFrom(doc, ".ashby-job-posting-brief-company-name");
            if (!isBlank(company)) { result.setCompany(company.trim()); found = true; }
        }
        if (isBlank(result.getDescription())) {
            String desc = textFrom(doc,
                ".ashby-job-posting-description, " +
                "[class*=JobPostingDescription]");
            if (!isBlank(desc)) { result.setDescription(desc); found = true; }
        }

        return found;
    }

    // ── SmartRecruiters ──────────────────────────────────────────────────────────

    private boolean extractSmartRecruiters(Document doc, ParsedJobDto result) {
        boolean found = false;

        if (isBlank(result.getTitle())) {
            String title = textFrom(doc, "h1.job-title, h1[itemprop=title], h1");
            if (!isBlank(title)) { result.setTitle(title); found = true; }
        }
        if (isBlank(result.getCompany())) {
            String company = textFrom(doc, ".company-name, [itemprop=hiringOrganization] [itemprop=name]");
            if (!isBlank(company)) { result.setCompany(company.trim()); found = true; }
        }
        if (isBlank(result.getLocation())) {
            String location = textFrom(doc, ".job-location, [itemprop=jobLocation] [itemprop=address]");
            if (!isBlank(location)) { result.setLocation(location.trim()); found = true; }
        }
        if (isBlank(result.getDescription())) {
            String desc = textFrom(doc, ".job-description, .job-sections, [itemprop=description]");
            if (!isBlank(desc)) { result.setDescription(desc); found = true; }
        }

        return found;
    }

    // ── Workable ─────────────────────────────────────────────────────────────────

    private boolean extractWorkable(Document doc, ParsedJobDto result) {
        boolean found = false;

        if (isBlank(result.getTitle())) {
            String title = textFrom(doc, "h1[data-ui=job-title], h1.job-title, h1");
            if (!isBlank(title)) { result.setTitle(title); found = true; }
        }
        if (isBlank(result.getLocation())) {
            String location = textFrom(doc, "[data-ui=job-location], .job-location, span[itemprop=addressLocality]");
            if (!isBlank(location)) { result.setLocation(location.trim()); found = true; }
        }
        if (isBlank(result.getDescription())) {
            String desc = textFrom(doc, "[data-ui=job-description], .job-description");
            if (!isBlank(desc)) { result.setDescription(desc); found = true; }
        }

        return found;
    }

    // ── Breezy HR ────────────────────────────────────────────────────────────────

    private boolean extractBreezy(Document doc, ParsedJobDto result) {
        boolean found = false;

        if (isBlank(result.getTitle())) {
            String title = textFrom(doc, "h1.position-title, h2.position-title, h1");
            if (!isBlank(title)) { result.setTitle(title); found = true; }
        }
        if (isBlank(result.getCompany())) {
            String company = textFrom(doc, ".company-name, .company-title");
            if (!isBlank(company)) { result.setCompany(company.trim()); found = true; }
        }
        if (isBlank(result.getLocation())) {
            String location = textFrom(doc, ".location, li.location");
            if (!isBlank(location)) { result.setLocation(location.trim()); found = true; }
        }
        if (isBlank(result.getDescription())) {
            String desc = textFrom(doc, ".description, .position-description");
            if (!isBlank(desc)) { result.setDescription(desc); found = true; }
        }

        return found;
    }

    // ── iCIMS ────────────────────────────────────────────────────────────────────

    private boolean extractICIMS(Document doc, ParsedJobDto result) {
        boolean found = false;

        if (isBlank(result.getTitle())) {
            String title = textFrom(doc,
                ".iCIMS_Header h1, " +
                "h1.iCIMS_JobHeaderTitle, " +
                ".header-title h1");
            if (!isBlank(title)) { result.setTitle(title); found = true; }
        }
        if (isBlank(result.getLocation())) {
            String location = textFrom(doc,
                ".iCIMS_JobHeaderLocation, " +
                ".header-location, " +
                "[class*=location]");
            if (!isBlank(location)) { result.setLocation(location.trim()); found = true; }
        }
        if (isBlank(result.getDescription())) {
            String desc = textFrom(doc,
                ".iCIMS_JobContent, " +
                ".iCIMS_InfoMsg_Job, " +
                ".job-description");
            if (!isBlank(desc)) { result.setDescription(desc); found = true; }
        }

        return found;
    }

    // ── Jobvite ──────────────────────────────────────────────────────────────────

    private boolean extractJobvite(Document doc, ParsedJobDto result) {
        boolean found = false;

        if (isBlank(result.getTitle())) {
            String title = textFrom(doc, "h2.jv-header, .jv-job-detail-name, h1");
            if (!isBlank(title)) { result.setTitle(title); found = true; }
        }
        if (isBlank(result.getCompany())) {
            String company = textFrom(doc, ".jv-company-name, .company-name");
            if (!isBlank(company)) { result.setCompany(company.trim()); found = true; }
        }
        if (isBlank(result.getLocation())) {
            String location = textFrom(doc, ".jv-job-detail-meta .location, .jv-location");
            if (!isBlank(location)) { result.setLocation(location.trim()); found = true; }
        }
        if (isBlank(result.getDescription())) {
            String desc = textFrom(doc, ".jv-job-detail-description, .jv-job-description");
            if (!isBlank(desc)) { result.setDescription(desc); found = true; }
        }

        return found;
    }

    // ── Generic HTML Fallback ────────────────────────────────────────────────────

    private boolean extractGenericHtml(Document doc, ParsedJobDto result) {
        boolean found = false;

        // Try common patterns for job title
        if (isBlank(result.getTitle())) {
            String title = textFrom(doc,
                "h1[class*=title i], " +
                "h1[class*=job i], " +
                "h1[itemprop=title], " +
                "[class*=job-title i], " +
                "[class*=jobTitle i], " +
                "[data-testid*=title i]");
            if (!isBlank(title)) { result.setTitle(title); found = true; }
        }

        // Try common patterns for company
        if (isBlank(result.getCompany())) {
            String company = textFrom(doc,
                "[class*=company-name i], " +
                "[class*=companyName i], " +
                "[itemprop=hiringOrganization], " +
                "[class*=employer i]");
            if (!isBlank(company)) { result.setCompany(company.trim()); found = true; }
        }

        // Try common patterns for location
        if (isBlank(result.getLocation())) {
            String location = textFrom(doc,
                "[class*=location i], " +
                "[itemprop=jobLocation], " +
                "[data-testid*=location i]");
            if (!isBlank(location) && location.length() < 200) {
                result.setLocation(location.trim());
                found = true;
            }
        }

        // Try common description containers
        if (isBlank(result.getDescription())) {
            String desc = textFrom(doc,
                "[class*=job-description i], " +
                "[class*=jobDescription i], " +
                "[class*=description i][class*=job i], " +
                "[itemprop=description], " +
                "article, " +
                ".content-body");
            if (!isBlank(desc) && desc.length() > 50) { result.setDescription(desc); found = true; }
        }

        return found;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  POST-PROCESSING
    // ══════════════════════════════════════════════════════════════════════════════

    private void postProcess(Document doc, ParsedJobDto result) {
        // Extract tech stacks from description if not already set
        if (isBlank(result.getTechStacks()) && !isBlank(result.getDescription())) {
            String techs = extractTechFromText(result.getDescription());
            if (!isBlank(techs)) {
                result.setTechStacks(techs);
            }
        }

        // Detect work type from description if not already set
        if (isBlank(result.getWorkType()) && !isBlank(result.getDescription())) {
            result.setWorkType(detectWorkType(result.getDescription()));
        }

        // Extract salary from description if not already set
        if (isBlank(result.getSalary()) && !isBlank(result.getDescription())) {
            Matcher m = SALARY_PATTERN.matcher(result.getDescription());
            if (m.find()) {
                result.setSalary(m.group().trim());
            }
        }

        // Truncate overly long descriptions (keep first ~5000 chars)
        if (!isBlank(result.getDescription()) && result.getDescription().length() > 5000) {
            result.setDescription(result.getDescription().substring(0, 5000).trim() + "...");
        }

        // Clean up title: remove "Job: " or "Position: " prefix
        if (!isBlank(result.getTitle())) {
            result.setTitle(result.getTitle()
                .replaceAll("(?i)^(job|position|role)\\s*:\\s*", "")
                .trim());
        }

        // If company is still null, try to extract from URL domain
        if (isBlank(result.getCompany()) && !isBlank(result.getJobUrl())) {
            try {
                String host = new java.net.URL(result.getJobUrl()).getHost();
                // Skip known job board domains
                Set<String> jobBoards = Set.of("linkedin.com", "indeed.com", "glassdoor.com",
                    "greenhouse.io", "lever.co", "workable.com", "smartrecruiters.com");
                boolean isJobBoard = jobBoards.stream().anyMatch(host::contains);
                if (!isJobBoard) {
                    String[] parts = host.split("\\.");
                    String domain = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
                    domain = domain.substring(0, 1).toUpperCase() + domain.substring(1);
                    result.setCompany(domain);
                }
            } catch (Exception ignored) {}
        }
    }

    // ══════════════════════════════════════════════════════════════════════════════
    //  UTILITY METHODS
    // ══════════════════════════════════════════════════════════════════════════════

    /** Extract first non-empty text from a CSS selector chain. */
    private String textFrom(Document doc, String selector) {
        try {
            Elements els = doc.select(selector);
            for (Element el : els) {
                String text = el.text().trim();
                if (!text.isEmpty()) return text;
            }
        } catch (Exception e) {
            log.debug("Selector '{}' failed: {}", selector, e.getMessage());
        }
        return null;
    }

    /** Get a string value from a JSON object, returns null if absent or blank. */
    private String getJsonString(JsonObject obj, String key) {
        if (obj == null || !obj.has(key)) return null;
        JsonElement el = obj.get(key);
        if (el.isJsonPrimitive()) {
            String val = el.getAsString().trim();
            return val.isEmpty() ? null : val;
        }
        return null;
    }

    /** Get meta tag content by property or name. */
    private String getMeta(Document doc, String property) {
        String val = doc.select("meta[property=" + property + "]").attr("content");
        if (isBlank(val)) {
            val = doc.select("meta[name=" + property + "]").attr("content");
        }
        return isBlank(val) ? null : val.trim();
    }

    /** Strip HTML tags and normalize whitespace, preserving paragraph structure. */
    private String cleanHtml(String html) {
        if (html == null) return null;
        // Parse HTML to text, which Jsoup handles well
        Document fragment = Jsoup.parseBodyFragment(html);
        // Convert <br>, <p>, <li>, <div> to newlines for readability
        fragment.select("br").append("\n");
        fragment.select("p, div, li, h1, h2, h3, h4, h5, h6").prepend("\n");
        fragment.select("li").prepend("• ");
        String text = fragment.body().text();
        // Normalize whitespace: collapse multiple spaces but preserve newlines
        text = text.replaceAll("[\\t ]+", " ");
        text = text.replaceAll("\\n\\s*\\n+", "\n\n");
        return text.trim();
    }

    /** Extract technology keywords from text by word-boundary matching. */
    private String extractTechFromText(String text) {
        if (text == null) return null;

        Set<String> found = new LinkedHashSet<>();
        String lowerText = text.toLowerCase();

        for (Map.Entry<String, String> entry : TECH_KEYWORD_MAP.entrySet()) {
            String lowerKeyword = entry.getKey();
            String originalKeyword = entry.getValue();

            // Simple word boundary check
            int idx = lowerText.indexOf(lowerKeyword);
            while (idx >= 0) {
                boolean leftBound = (idx == 0) || !Character.isLetterOrDigit(lowerText.charAt(idx - 1));
                int end = idx + lowerKeyword.length();
                boolean rightBound = (end >= lowerText.length()) || !Character.isLetterOrDigit(lowerText.charAt(end));

                if (leftBound && rightBound) {
                    found.add(originalKeyword);
                    break;
                }
                idx = lowerText.indexOf(lowerKeyword, idx + 1);
            }
        }

        if (found.isEmpty()) return null;

        // Limit to top 15 techs to avoid noise
        return found.stream().limit(15).collect(Collectors.joining(", "));
    }

    /** Detect work type from description text. */
    private String detectWorkType(String text) {
        if (text == null) return null;
        String lower = text.toLowerCase();

        // Check for explicit patterns
        if (lower.contains("fully remote") || lower.contains("100% remote") ||
            lower.contains("work from home") || lower.contains("work from anywhere") ||
            lower.contains("remote position") || lower.contains("remote role") ||
            lower.contains("remote-first") || lower.contains("telecommute")) {
            return "Remote";
        }
        if (lower.contains("hybrid") || lower.contains("partially remote") ||
            lower.contains("flexible work") || lower.contains("mix of remote and")) {
            return "Hybrid";
        }
        if (lower.contains("on-site") || lower.contains("onsite") ||
            lower.contains("in-office") || lower.contains("office-based") ||
            lower.contains("in person") || lower.contains("in-person")) {
            return "On-site";
        }

        return null;
    }

    /** Normalize employment type strings to our work type values. */
    private String normalizeWorkType(String empType) {
        if (empType == null) return null;
        String lower = empType.toLowerCase().trim();

        if (lower.contains("remote") || lower.contains("telecommute")) return "Remote";
        if (lower.contains("hybrid")) return "Hybrid";
        if (lower.contains("on-site") || lower.contains("onsite") || lower.contains("in-office")) return "On-site";

        // Map standard schema.org values
        if (lower.contains("full_time") || lower.contains("full-time") || lower.contains("fulltime")) return null; // employment type, not work type
        if (lower.contains("part_time") || lower.contains("part-time") || lower.contains("parttime")) return null;
        if (lower.contains("contractor") || lower.contains("contract")) return null;
        if (lower.contains("intern")) return null;

        return null;
    }

    /** Format salary numbers (e.g. "150000" → "150,000"). */
    private String formatSalaryNumber(String number) {
        if (number == null) return "";
        try {
            // Remove existing formatting
            String cleaned = number.replaceAll("[^\\d.]", "");
            if (cleaned.isEmpty()) return number;
            double val = Double.parseDouble(cleaned);
            if (val >= 1000) {
                return String.format("%,.0f", val);
            }
            return cleaned;
        } catch (NumberFormatException e) {
            return number;
        }
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
