/**
 * Applyr Chrome Extension — Content Script (Client-side Job Parser)
 *
 * Runs on every page at document_idle. Listens for a PARSE_JOB message
 * from the popup and extracts job posting data using a 3-tier strategy:
 *
 *   Tier 1: JSON-LD (Schema.org JobPosting) — highest reliability
 *   Tier 2: Open Graph & meta tags — broad fallback
 *   Tier 3: Site-specific HTML selectors — targeted scraping
 *
 * All parsing happens entirely client-side in the user's browser,
 * which means it works on pages that block server-side scraping
 * (LinkedIn, Indeed, etc.) because we're reading the live DOM.
 */

// ── Message Listener ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "PARSE_JOB") {
    try {
      const result = parseJobPage();
      sendResponse(result);
    } catch (err) {
      sendResponse({ error: "Parse failed: " + err.message });
    }
  }
  // Return true to indicate async response (even though ours is sync,
  // this avoids "message port closed" errors in some Chrome versions)
  return true;
});

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN PARSER
// ══════════════════════════════════════════════════════════════════════════════

function parseJobPage() {
  const result = {
    title: null,
    company: null,
    location: null,
    salary: null,
    workType: null,
    techStacks: null,
    description: null,
    jobUrl: window.location.href,
    source: null,
  };

  const sources = [];

  // ── Tier 1: JSON-LD ──────────────────────────────────────────────────────
  if (extractFromJsonLd(result)) {
    sources.push("JSON_LD");
  }

  // ── Tier 2: Open Graph / Meta tags ───────────────────────────────────────
  if (extractFromMetaTags(result)) {
    sources.push("META");
  }

  // ── Tier 3: Site-specific HTML selectors ─────────────────────────────────
  if (extractFromHtmlSelectors(result)) {
    sources.push("HTML");
  }

  // ── Post-processing ──────────────────────────────────────────────────────
  postProcess(result);

  // Set source
  if (sources.length === 0) result.source = "NONE";
  else if (sources.length === 1) result.source = sources[0];
  else result.source = "COMBINED";

  return result;
}

// ══════════════════════════════════════════════════════════════════════════════
//  TIER 1: JSON-LD
// ══════════════════════════════════════════════════════════════════════════════

function extractFromJsonLd(result) {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  if (scripts.length === 0) return false;

  let found = false;

  for (const script of scripts) {
    try {
      const text = script.textContent.trim();
      if (!text) continue;

      const json = JSON.parse(text);
      const jobPosting = findJobPosting(json);

      if (jobPosting) {
        found = true;
        extractFromJobPosting(jobPosting, result);
      }
    } catch {
      // Malformed JSON-LD, skip
    }
  }

  return found;
}

/** Recursively search for a JobPosting object, handling @graph arrays. */
function findJobPosting(obj) {
  if (!obj) return null;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findJobPosting(item);
      if (found) return found;
    }
    return null;
  }

  if (typeof obj === "object") {
    const type = obj["@type"];
    // Handle both string and array @type
    const isJobPosting =
      type === "JobPosting" ||
      (Array.isArray(type) && type.includes("JobPosting"));

    if (isJobPosting) return obj;

    // Check @graph
    if (obj["@graph"]) {
      return findJobPosting(obj["@graph"]);
    }
  }

  return null;
}

function extractFromJobPosting(jp, result) {
  // Title
  if (!result.title) {
    result.title = jp.title || null;
  }

  // Company
  if (!result.company) {
    const ho = jp.hiringOrganization;
    if (typeof ho === "string") result.company = ho;
    else if (ho && typeof ho === "object") result.company = ho.name || null;
  }

  // Location
  if (!result.location) {
    result.location = extractLocationFromJsonLd(jp);
  }

  // Description
  if (!result.description) {
    const desc = jp.description;
    if (desc) result.description = cleanHtml(desc);
  }

  // Salary
  if (!result.salary) {
    result.salary = extractSalaryFromJsonLd(jp);
  }

  // Work type
  if (!result.workType) {
    if (jp.jobLocationType === "TELECOMMUTE") {
      result.workType = "Remote";
    } else if (jp.employmentType) {
      result.workType = normalizeWorkType(jp.employmentType);
    }
  }

  // Skills
  if (!result.techStacks) {
    if (jp.skills) {
      result.techStacks = typeof jp.skills === "string" ? jp.skills : jp.skills.join(", ");
    }
  }
}

function extractLocationFromJsonLd(jp) {
  const loc = jp.jobLocation;
  if (!loc) return null;

  const locations = Array.isArray(loc) ? loc : [loc];
  const parts = [];

  for (const l of locations) {
    if (typeof l === "string") {
      parts.push(l);
      continue;
    }
    if (l.address) {
      const addr = l.address;
      const segments = [];
      if (addr.addressLocality) segments.push(addr.addressLocality);
      if (addr.addressRegion) segments.push(addr.addressRegion);
      const country = typeof addr.addressCountry === "object"
        ? addr.addressCountry?.name
        : addr.addressCountry;
      if (country) segments.push(country);
      if (segments.length > 0) parts.push(segments.join(", "));
    } else if (l.name) {
      parts.push(l.name);
    }
  }

  return parts.length > 0 ? parts.join(" / ") : null;
}

function extractSalaryFromJsonLd(jp) {
  const salary = jp.baseSalary;
  if (!salary || typeof salary !== "object") return null;

  const currency = salary.currency || "USD";
  const symbol = ({ USD: "$", EUR: "€", GBP: "£", CAD: "CA$", AUD: "A$" })[currency.toUpperCase()] || currency + " ";

  const value = salary.value;
  if (!value) return null;

  if (typeof value === "object") {
    const min = value.minValue;
    const max = value.maxValue;
    const exact = value.value;
    const unit = value.unitText;

    let suffix = "";
    if (unit === "YEAR") suffix = "/yr";
    else if (unit === "MONTH") suffix = "/mo";
    else if (unit === "HOUR") suffix = "/hr";

    if (min && max) return `${symbol}${formatNum(min)} - ${symbol}${formatNum(max)}${suffix}`;
    if (exact) return `${symbol}${formatNum(exact)}${suffix}`;
  } else {
    return `${symbol}${formatNum(value)}`;
  }

  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
//  TIER 2: OPEN GRAPH & META TAGS
// ══════════════════════════════════════════════════════════════════════════════

function extractFromMetaTags(result) {
  let found = false;

  // Title
  if (!result.title) {
    const ogTitle = getMeta("og:title");
    if (ogTitle) {
      // Split patterns like "Software Engineer at Google" or "Role | Company"
      const parts = ogTitle.split(/\s+(?:at|@|\||-|–|—|·)\s+/);
      if (parts.length >= 2) {
        result.title = parts[0].trim();
        if (!result.company) result.company = parts[parts.length - 1].trim();
      } else {
        result.title = ogTitle.trim();
      }
      found = true;
    }
  }

  // Company
  if (!result.company) {
    const siteName = getMeta("og:site_name");
    if (siteName) {
      result.company = siteName.trim();
      found = true;
    }
  }

  // Description
  if (!result.description) {
    const desc = getMeta("og:description") || getMeta("description");
    if (desc) {
      result.description = cleanHtml(desc);
      found = true;
    }
  }

  // Fallback title from <title> tag
  if (!result.title) {
    const pageTitle = document.title;
    if (pageTitle) {
      const cleaned = pageTitle.split(/\s*[|–—]\s*/)[0].trim();
      if (cleaned.length > 3) {
        result.title = cleaned;
        found = true;
      }
    }
  }

  return found;
}

// ══════════════════════════════════════════════════════════════════════════════
//  TIER 3: SITE-SPECIFIC HTML SELECTORS
// ══════════════════════════════════════════════════════════════════════════════

function extractFromHtmlSelectors(result) {
  const host = window.location.hostname.toLowerCase();

  if (host.includes("greenhouse.io")) return extractGreenhouse(result);
  if (host.includes("lever.co")) return extractLever(result);
  if (host.includes("linkedin.com")) return extractLinkedIn(result);
  if (host.includes("indeed.com")) return extractIndeed(result);
  if (host.includes("myworkdayjobs.com") || host.includes("workday.com")) return extractWorkday(result);
  if (host.includes("ashbyhq.com")) return extractAshby(result);
  if (host.includes("smartrecruiters.com")) return extractSmartRecruiters(result);
  if (host.includes("workable.com")) return extractWorkable(result);
  if (host.includes("breezy.hr")) return extractBreezy(result);
  if (host.includes("icims.com")) return extractICIMS(result);
  if (host.includes("jobvite.com")) return extractJobvite(result);
  if (host.includes("glassdoor.com")) return extractGlassdoor(result);
  if (host.includes("ziprecruiter.com")) return extractZipRecruiter(result);
  if (host.includes("dice.com")) return extractDice(result);
  if (host.includes("monster.com")) return extractMonster(result);
  if (host.includes("angel.co") || host.includes("wellfound.com")) return extractWellfound(result);

  return extractGeneric(result);
}

// ── LinkedIn ─────────────────────────────────────────────────────────────────

function extractLinkedIn(result) {
  let found = false;

  if (!result.title) {
    const title = textFrom(
      ".job-details-jobs-unified-top-card__job-title h1," +
      ".top-card-layout__title," +
      ".topcard__title," +
      "h1.t-24," +
      "h2.top-card-layout__title," +
      ".jobs-unified-top-card__job-title," +
      "h1"
    );
    if (title) { result.title = title; found = true; }
  }

  if (!result.company) {
    const company = textFrom(
      ".job-details-jobs-unified-top-card__company-name a," +
      ".job-details-jobs-unified-top-card__company-name," +
      ".topcard__org-name-link," +
      ".top-card-layout__second-subline a," +
      "a.topcard__org-name-link," +
      ".topcard__flavor--black-link," +
      ".jobs-unified-top-card__company-name a"
    );
    if (company) { result.company = company.trim(); found = true; }
  }

  if (!result.location) {
    const location = textFrom(
      ".job-details-jobs-unified-top-card__bullet," +
      ".topcard__flavor--bullet," +
      ".top-card-layout__bullet," +
      "span.topcard__flavor--bullet," +
      ".jobs-unified-top-card__bullet"
    );
    if (location) { result.location = location.trim(); found = true; }
  }

  if (!result.workType) {
    const workplaceType = textFrom(
      ".job-details-jobs-unified-top-card__workplace-type," +
      ".jobs-unified-top-card__workplace-type"
    );
    if (workplaceType) {
      result.workType = normalizeWorkType(workplaceType);
      found = true;
    }
  }

  if (!result.description) {
    const desc = textFrom(
      ".jobs-description__content," +
      ".jobs-description-content__text," +
      ".description__text," +
      ".show-more-less-html__markup," +
      "#job-details"
    );
    if (desc) { result.description = desc; found = true; }
  }

  // LinkedIn salary info
  if (!result.salary) {
    const salary = textFrom(
      ".job-details-jobs-unified-top-card__job-insight--highlight span," +
      ".salary-main-rail__salary-range," +
      ".compensation__salary"
    );
    if (salary && /\d/.test(salary)) { result.salary = salary.trim(); found = true; }
  }

  return found;
}

// ── Indeed ────────────────────────────────────────────────────────────────────

function extractIndeed(result) {
  let found = false;

  if (!result.title) {
    const title = textFrom(
      "h1.jobsearch-JobInfoHeader-title," +
      'h1[data-testid="jobsearch-JobInfoHeader-title"],' +
      ".jobsearch-JobInfoHeader-title-container h1," +
      "h2.jobTitle span"
    );
    if (title) { result.title = title; found = true; }
  }

  if (!result.company) {
    const company = textFrom(
      "[data-company-name] a," +
      "[data-company-name]," +
      "div.jobsearch-InlineCompanyRating a," +
      '[data-testid="inlineHeader-companyName"] a'
    );
    if (company) { result.company = company.trim(); found = true; }
  }

  if (!result.location) {
    const location = textFrom(
      "[data-testid=job-location]," +
      '[data-testid="inlineHeader-companyLocation"],' +
      "div.jobsearch-JobInfoHeader-subtitle .companyLocation," +
      ".jobsearch-JobInfoHeader-subtitle > div:last-child"
    );
    if (location) { result.location = location.trim(); found = true; }
  }

  if (!result.description) {
    const desc = textFrom("#jobDescriptionText, .jobsearch-jobDescriptionText");
    if (desc) { result.description = desc; found = true; }
  }

  if (!result.salary) {
    const salary = textFrom(
      "#salaryInfoAndJobType .salary-snippet," +
      "[data-testid=attribute_snippet_testid]," +
      ".jobsearch-JobMetadataHeader-item"
    );
    if (salary && /\d/.test(salary)) { result.salary = salary.trim(); found = true; }
  }

  return found;
}

// ── Greenhouse ───────────────────────────────────────────────────────────────

function extractGreenhouse(result) {
  let found = false;

  if (!result.title) {
    const t = textFrom(".app-title, h1.posting-headline, h1");
    if (t) { result.title = t; found = true; }
  }
  if (!result.company) {
    const c = textFrom(".company-name, span.company-name");
    if (c) { result.company = c; found = true; }
  }
  if (!result.location) {
    const l = textFrom(".location, .body--metadata--location");
    if (l) { result.location = l; found = true; }
  }
  if (!result.description) {
    const d = textFrom("#content, .content, #job-content");
    if (d) { result.description = d; found = true; }
  }

  return found;
}

// ── Lever ────────────────────────────────────────────────────────────────────

function extractLever(result) {
  let found = false;

  if (!result.title) {
    const t = textFrom(".posting-headline h2, h2[data-qa=posting-name]");
    if (t) { result.title = t; found = true; }
  }
  if (!result.location) {
    const l = textFrom(".posting-categories .location, .posting-category.location");
    if (l) { result.location = l; found = true; }
  }
  if (!result.workType) {
    const c = textFrom(".posting-categories .commitment, .posting-category.commitment");
    if (c) { result.workType = normalizeWorkType(c); found = true; }
  }
  if (!result.description) {
    const d = textFrom(".posting-page .content, [data-qa=posting-description]");
    if (d) { result.description = d; found = true; }
  }

  return found;
}

// ── Workday ──────────────────────────────────────────────────────────────────

function extractWorkday(result) {
  let found = false;

  if (!result.title) {
    const t = textFrom('[data-automation-id=jobPostingHeader] h2, h2[data-automation-id=jobTitle]');
    if (t) { result.title = t; found = true; }
  }
  if (!result.location) {
    const l = textFrom('[data-automation-id=locations], [data-automation-id=jobPostingLocation]');
    if (l) { result.location = l.trim(); found = true; }
  }
  if (!result.description) {
    const d = textFrom('[data-automation-id=jobPostingDescription]');
    if (d) { result.description = d; found = true; }
  }

  return found;
}

// ── Ashby ────────────────────────────────────────────────────────────────────

function extractAshby(result) {
  let found = false;

  if (!result.title) {
    const t = textFrom("h1.ashby-job-posting-brief-title, h1[class*=JobPostingBrief], h1");
    if (t) { result.title = t; found = true; }
  }
  if (!result.company) {
    const c = textFrom(".ashby-job-posting-brief-company-name");
    if (c) { result.company = c.trim(); found = true; }
  }
  if (!result.location) {
    const l = textFrom(".ashby-job-posting-location, p[class*=location]");
    if (l) { result.location = l.trim(); found = true; }
  }
  if (!result.description) {
    const d = textFrom(".ashby-job-posting-description, [class*=JobPostingDescription]");
    if (d) { result.description = d; found = true; }
  }

  return found;
}

// ── SmartRecruiters ──────────────────────────────────────────────────────────

function extractSmartRecruiters(result) {
  let found = false;

  if (!result.title) {
    const t = textFrom("h1.job-title, h1[itemprop=title], h1");
    if (t) { result.title = t; found = true; }
  }
  if (!result.company) {
    const c = textFrom(".company-name, [itemprop=hiringOrganization] [itemprop=name]");
    if (c) { result.company = c.trim(); found = true; }
  }
  if (!result.location) {
    const l = textFrom(".job-location, [itemprop=jobLocation] [itemprop=address]");
    if (l) { result.location = l.trim(); found = true; }
  }
  if (!result.description) {
    const d = textFrom(".job-description, .job-sections, [itemprop=description]");
    if (d) { result.description = d; found = true; }
  }

  return found;
}

// ── Workable ─────────────────────────────────────────────────────────────────

function extractWorkable(result) {
  let found = false;

  if (!result.title) {
    const t = textFrom("h1[data-ui=job-title], h1.job-title, h1");
    if (t) { result.title = t; found = true; }
  }
  if (!result.location) {
    const l = textFrom("[data-ui=job-location], .job-location");
    if (l) { result.location = l.trim(); found = true; }
  }
  if (!result.description) {
    const d = textFrom("[data-ui=job-description], .job-description");
    if (d) { result.description = d; found = true; }
  }

  return found;
}

// ── Breezy HR ────────────────────────────────────────────────────────────────

function extractBreezy(result) {
  let found = false;

  if (!result.title) {
    const t = textFrom("h1.position-title, h2.position-title, h1");
    if (t) { result.title = t; found = true; }
  }
  if (!result.company) {
    const c = textFrom(".company-name, .company-title");
    if (c) { result.company = c.trim(); found = true; }
  }
  if (!result.location) {
    const l = textFrom(".location, li.location");
    if (l) { result.location = l.trim(); found = true; }
  }
  if (!result.description) {
    const d = textFrom(".description, .position-description");
    if (d) { result.description = d; found = true; }
  }

  return found;
}

// ── iCIMS ────────────────────────────────────────────────────────────────────

function extractICIMS(result) {
  let found = false;

  if (!result.title) {
    const t = textFrom(".iCIMS_Header h1, h1.iCIMS_JobHeaderTitle");
    if (t) { result.title = t; found = true; }
  }
  if (!result.location) {
    const l = textFrom(".iCIMS_JobHeaderLocation, .header-location");
    if (l) { result.location = l.trim(); found = true; }
  }
  if (!result.description) {
    const d = textFrom(".iCIMS_JobContent, .iCIMS_InfoMsg_Job");
    if (d) { result.description = d; found = true; }
  }

  return found;
}

// ── Jobvite ──────────────────────────────────────────────────────────────────

function extractJobvite(result) {
  let found = false;

  if (!result.title) {
    const t = textFrom("h2.jv-header, .jv-job-detail-name, h1");
    if (t) { result.title = t; found = true; }
  }
  if (!result.company) {
    const c = textFrom(".jv-company-name, .company-name");
    if (c) { result.company = c.trim(); found = true; }
  }
  if (!result.location) {
    const l = textFrom(".jv-job-detail-meta .location, .jv-location");
    if (l) { result.location = l.trim(); found = true; }
  }
  if (!result.description) {
    const d = textFrom(".jv-job-detail-description, .jv-job-description");
    if (d) { result.description = d; found = true; }
  }

  return found;
}

// ── Glassdoor ────────────────────────────────────────────────────────────────

function extractGlassdoor(result) {
  let found = false;

  if (!result.title) {
    const t = textFrom(
      "[data-test=job-title], .css-w04er8, h1.e1tk4kwz5," +
      ".JobInfoHeaderTitle, h1"
    );
    if (t) { result.title = t; found = true; }
  }
  if (!result.company) {
    const c = textFrom(
      "[data-test=employer-name], .css-87uc0g, .e1tk4kwz1," +
      ".EmployerName"
    );
    if (c) { result.company = c.trim(); found = true; }
  }
  if (!result.location) {
    const l = textFrom(
      "[data-test=location], .css-56kyx5, .e1tk4kwz3," +
      ".JobInfoHeaderLocation"
    );
    if (l) { result.location = l.trim(); found = true; }
  }
  if (!result.salary) {
    const s = textFrom(
      "[data-test=detailSalary], .css-1bluz6i, .SalaryEstimate," +
      ".e1wijj240"
    );
    if (s && /\d/.test(s)) { result.salary = s.trim(); found = true; }
  }
  if (!result.description) {
    const d = textFrom(
      ".jobDescriptionContent, [data-test=job-description]," +
      "#JobDescriptionContainer, .desc"
    );
    if (d) { result.description = d; found = true; }
  }

  return found;
}

// ── ZipRecruiter ─────────────────────────────────────────────────────────────

function extractZipRecruiter(result) {
  let found = false;

  if (!result.title) {
    const t = textFrom("h1.job_title, .job_title, h1");
    if (t) { result.title = t; found = true; }
  }
  if (!result.company) {
    const c = textFrom(".hiring_company_text a, .hiring_company_text, .t_company_name");
    if (c) { result.company = c.trim(); found = true; }
  }
  if (!result.location) {
    const l = textFrom(".location_text, .t_location_text, .job_location");
    if (l) { result.location = l.trim(); found = true; }
  }
  if (!result.salary) {
    const s = textFrom(".job_salary, .salary_range");
    if (s && /\d/.test(s)) { result.salary = s.trim(); found = true; }
  }
  if (!result.description) {
    const d = textFrom(".jobDescriptionSection, #job_description, .job_description");
    if (d) { result.description = d; found = true; }
  }

  return found;
}

// ── Dice ─────────────────────────────────────────────────────────────────────

function extractDice(result) {
  let found = false;

  if (!result.title) {
    const t = textFrom("h1[data-cy=jobTitle], h1.jobTitle, h1");
    if (t) { result.title = t; found = true; }
  }
  if (!result.company) {
    const c = textFrom("[data-cy=companyNameLink] a, [data-cy=companyNameLink], .company-name-link a");
    if (c) { result.company = c.trim(); found = true; }
  }
  if (!result.location) {
    const l = textFrom("[data-cy=location], .location-type-label");
    if (l) { result.location = l.trim(); found = true; }
  }
  if (!result.description) {
    const d = textFrom("[data-cy=jobDescription], .job-description");
    if (d) { result.description = d; found = true; }
  }

  return found;
}

// ── Monster ──────────────────────────────────────────────────────────────────

function extractMonster(result) {
  let found = false;

  if (!result.title) {
    const t = textFrom("h1.title, .job-title-text, h1");
    if (t) { result.title = t; found = true; }
  }
  if (!result.company) {
    const c = textFrom(".company-name, .job-company-name a");
    if (c) { result.company = c.trim(); found = true; }
  }
  if (!result.location) {
    const l = textFrom(".location-text, .job-location");
    if (l) { result.location = l.trim(); found = true; }
  }
  if (!result.description) {
    const d = textFrom(".job-description, #JobDescription");
    if (d) { result.description = d; found = true; }
  }

  return found;
}

// ── Wellfound (AngelList) ────────────────────────────────────────────────────

function extractWellfound(result) {
  let found = false;

  if (!result.title) {
    const t = textFrom("h1.listing-title, h1");
    if (t) { result.title = t; found = true; }
  }
  if (!result.company) {
    const c = textFrom("a.company-name, .company-summary h2 a");
    if (c) { result.company = c.trim(); found = true; }
  }
  if (!result.location) {
    const l = textFrom(".listing-tag.location, .job-location");
    if (l) { result.location = l.trim(); found = true; }
  }
  if (!result.salary) {
    const s = textFrom(".listing-tag.compensation, .salary");
    if (s && /\d/.test(s)) { result.salary = s.trim(); found = true; }
  }
  if (!result.description) {
    const d = textFrom(".listing-description, .job-description");
    if (d) { result.description = d; found = true; }
  }

  return found;
}

// ── Generic Fallback ─────────────────────────────────────────────────────────

function extractGeneric(result) {
  let found = false;

  if (!result.title) {
    const t = textFrom(
      'h1[class*="title" i], h1[class*="job" i], h1[itemprop=title],' +
      '[class*="job-title" i], [class*="jobTitle" i],' +
      '[data-testid*="title" i]'
    );
    if (t) { result.title = t; found = true; }
  }

  if (!result.company) {
    const c = textFrom(
      '[class*="company-name" i], [class*="companyName" i],' +
      '[itemprop=hiringOrganization], [class*="employer" i]'
    );
    if (c) { result.company = c.trim(); found = true; }
  }

  if (!result.location) {
    const l = textFrom(
      '[class*="location" i], [itemprop=jobLocation],' +
      '[data-testid*="location" i]'
    );
    if (l && l.length < 200) { result.location = l.trim(); found = true; }
  }

  if (!result.description) {
    const d = textFrom(
      '[class*="job-description" i], [class*="jobDescription" i],' +
      '[itemprop=description], article, .content-body'
    );
    if (d && d.length > 50) { result.description = d; found = true; }
  }

  return found;
}

// ══════════════════════════════════════════════════════════════════════════════
//  POST-PROCESSING
// ══════════════════════════════════════════════════════════════════════════════

function postProcess(result) {
  // Extract tech stacks from description
  if (!result.techStacks && result.description) {
    result.techStacks = extractTechFromText(result.description);
  }

  // Detect work type from description
  if (!result.workType && result.description) {
    result.workType = detectWorkType(result.description);
  }

  // Extract salary from description
  if (!result.salary && result.description) {
    const salaryMatch = result.description.match(SALARY_REGEX);
    if (salaryMatch) result.salary = salaryMatch[0].trim();
  }

  // Truncate long descriptions
  if (result.description && result.description.length > 5000) {
    result.description = result.description.substring(0, 5000).trim() + "...";
  }

  // Clean title prefix
  if (result.title) {
    result.title = result.title.replace(/^(job|position|role)\s*:\s*/i, "").trim();
  }

  // Fallback company from domain
  if (!result.company) {
    try {
      const host = window.location.hostname;
      const jobBoards = ["linkedin.com", "indeed.com", "glassdoor.com", "greenhouse.io",
        "lever.co", "workable.com", "smartrecruiters.com", "ziprecruiter.com",
        "dice.com", "monster.com"];
      if (!jobBoards.some((b) => host.includes(b))) {
        const parts = host.split(".");
        const domain = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
        result.company = domain.charAt(0).toUpperCase() + domain.slice(1);
      }
    } catch { /* ignore */ }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/** Get first non-empty text from a comma-separated CSS selector string. */
function textFrom(selector) {
  try {
    const els = document.querySelectorAll(selector);
    for (const el of els) {
      const text = el.innerText?.trim() || el.textContent?.trim();
      if (text) return text;
    }
  } catch { /* invalid selector, ignore */ }
  return null;
}

/** Get meta tag content by property or name. */
function getMeta(name) {
  const el =
    document.querySelector(`meta[property="${name}"]`) ||
    document.querySelector(`meta[name="${name}"]`);
  const content = el?.getAttribute("content")?.trim();
  return content || null;
}

/** Strip HTML tags and normalize whitespace. */
function cleanHtml(html) {
  if (!html) return null;
  const div = document.createElement("div");
  div.innerHTML = html;
  // Convert block elements to newlines
  div.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  div.querySelectorAll("p, div, li, h1, h2, h3, h4, h5, h6").forEach((el) => {
    el.prepend(document.createTextNode("\n"));
  });
  div.querySelectorAll("li").forEach((li) => {
    li.prepend(document.createTextNode("• "));
  });
  let text = div.textContent || "";
  text = text.replace(/[\t ]+/g, " ");
  text = text.replace(/\n\s*\n+/g, "\n\n");
  return text.trim();
}

/** Format a number with commas (e.g. 150000 → 150,000). */
function formatNum(val) {
  const num = parseFloat(String(val).replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return val;
  return num >= 1000 ? num.toLocaleString("en-US", { maximumFractionDigits: 0 }) : String(val);
}

/** Normalize work type strings. */
function normalizeWorkType(str) {
  if (!str) return null;
  const lower = str.toLowerCase().trim();
  if (lower.includes("remote") || lower.includes("telecommute")) return "Remote";
  if (lower.includes("hybrid")) return "Hybrid";
  if (lower.includes("on-site") || lower.includes("onsite") || lower.includes("in-office")) return "On-site";
  return null;
}

/** Detect work type from description. */
function detectWorkType(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (/fully remote|100% remote|work from home|work from anywhere|remote position|remote role|remote-first|telecommute/i.test(lower)) return "Remote";
  if (/hybrid|partially remote|flexible work|mix of remote/i.test(lower)) return "Hybrid";
  if (/on-site|onsite|in-office|office-based|in.person/i.test(lower)) return "On-site";
  return null;
}

// ── Tech Stack Extraction ────────────────────────────────────────────────────

const TECH_KEYWORDS = [
  // Languages
  "Java", "Python", "JavaScript", "TypeScript", "Go", "Rust", "C++", "C#",
  "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R", "Dart", "Elixir",
  // Frontend
  "React", "Angular", "Vue", "Vue.js", "Svelte", "Next.js", "Nuxt",
  "HTML", "CSS", "SASS", "Tailwind", "Bootstrap", "jQuery",
  // Backend
  "Node.js", "Express", "Spring", "Spring Boot", "Django", "Flask", "FastAPI",
  "Rails", "Laravel", "ASP.NET", ".NET", "NestJS",
  // Databases
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "DynamoDB",
  "Cassandra", "SQLite", "MariaDB", "SQL Server", "Supabase", "Firebase",
  // Cloud & DevOps
  "AWS", "Azure", "GCP", "Google Cloud", "Docker", "Kubernetes", "Terraform",
  "Jenkins", "GitHub Actions", "GitLab CI", "Ansible",
  // Data & ML
  "TensorFlow", "PyTorch", "Pandas", "NumPy", "Spark", "Kafka",
  "Airflow", "Snowflake", "BigQuery", "Databricks",
  // Tools
  "Git", "GitHub", "GitLab", "Jira", "Figma", "Webpack", "Vite",
  "Jest", "Cypress", "Playwright", "Selenium",
  // Mobile
  "React Native", "Flutter", "SwiftUI", "Jetpack Compose",
  // APIs & Messaging
  "GraphQL", "REST", "gRPC", "RabbitMQ", "WebSocket", "Prisma", "Hibernate",
  // Monitoring
  "Datadog", "Grafana", "Prometheus", "New Relic", "Sentry",
];

// Build a case-insensitive lookup map
const TECH_MAP = {};
TECH_KEYWORDS.forEach((kw) => { TECH_MAP[kw.toLowerCase()] = kw; });

function extractTechFromText(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  const found = new Set();

  for (const [key, canonical] of Object.entries(TECH_MAP)) {
    let idx = lower.indexOf(key);
    while (idx >= 0) {
      const leftOk = idx === 0 || !/[a-zA-Z0-9]/.test(lower[idx - 1]);
      const end = idx + key.length;
      const rightOk = end >= lower.length || !/[a-zA-Z0-9]/.test(lower[end]);
      if (leftOk && rightOk) {
        found.add(canonical);
        break;
      }
      idx = lower.indexOf(key, idx + 1);
    }
  }

  if (found.size === 0) return null;
  return [...found].slice(0, 15).join(", ");
}

// ── Salary Regex ─────────────────────────────────────────────────────────────

const SALARY_REGEX = /(?:\$|USD|EUR|€|£|GBP|CAD|AUD)\s*[\d,]+(?:\.\d{1,2})?(?:k)?\s*(?:-|–|to)\s*(?:\$|USD|EUR|€|£|GBP|CAD|AUD)?\s*[\d,]+(?:\.\d{1,2})?(?:k)?(?:\s*(?:per\s+(?:year|annum|month|hr|hour)|\/(?:yr|mo|hr)))?/i;
