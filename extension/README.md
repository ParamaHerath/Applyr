# Applyr Chrome Extension

Extract job details from **any** job posting page — including LinkedIn, Indeed, Glassdoor, and every ATS platform — and send them directly to your Applyr dashboard in one click.

## Installation (Developer Mode)

Since the extension isn't published to the Chrome Web Store yet, you'll load it in developer mode:

1. Open Google Chrome and navigate to `chrome://extensions/`
2. Toggle **Developer mode** on (top-right corner)
3. Click **Load unpacked**
4. Select this `extension/` folder
5. The Applyr icon should appear in your browser toolbar

> **Tip:** Pin the extension by clicking the puzzle piece icon in the toolbar, then clicking the pin next to "Applyr — Job Application Parser".

## Usage

1. Navigate to any job posting page (e.g. a LinkedIn job, Indeed listing, Greenhouse board)
2. Click the **Applyr extension icon** in your toolbar
3. Click **"Parse This Page"** — the extension will extract job details from the page
4. Review the extracted data in the popup preview
5. Click **"Send to Applyr"** — this opens your Applyr dashboard with the application modal pre-filled
6. Review and save!

## How It Works

The extension uses a **3-tier client-side parsing strategy**:

1. **JSON-LD** — Looks for `<script type="application/ld+json">` blocks with Schema.org `JobPosting` data. This is the most reliable method; Google requires job boards to include this for indexing.

2. **Open Graph / Meta Tags** — Falls back to `og:title`, `og:site_name`, `og:description` and standard meta tags.

3. **Site-Specific HTML Selectors** — Targeted CSS selector extractors for 16 platforms:
   - LinkedIn, Indeed, Glassdoor, ZipRecruiter, Dice, Monster, Wellfound
   - Greenhouse, Lever, Workday, Ashby, SmartRecruiters, Workable
   - Breezy HR, iCIMS, Jobvite
   - Plus a **generic fallback** for any other site

### Why a Chrome Extension?

Sites like LinkedIn and Indeed use aggressive anti-bot protection (Cloudflare, Akamai). Server-side scraping (fetching the URL from a backend) gets blocked with 403 errors or CAPTCHAs.

The extension runs directly in **your browser**, using your own session and IP address. It reads the live DOM exactly as you see it — no anti-bot system can block it because it's indistinguishable from you reading the page yourself.

## Extracted Fields

| Field | Description |
|-------|-------------|
| **Title** | Job title / role name |
| **Company** | Hiring organization name |
| **Location** | City, state, country |
| **Salary** | Salary range or compensation |
| **Work Type** | Remote, Hybrid, or On-site |
| **Tech Stacks** | Technologies detected from the description (~100 keywords) |
| **Description** | Full job description text |

## Permissions

The extension requires minimal permissions:

- **`activeTab`** — Read the current tab's page content when you click the extension icon
- **`scripting`** — Inject the parser content script into pages

No data is sent to any third-party server. All parsing happens locally in your browser.
