/**
 * Applyr Chrome Extension — Popup Script
 *
 * Handles:
 * 1. Triggering the content script to parse the current tab's page
 * 2. Displaying the parsed results in the popup UI
 * 3. Saving parsed data to localStorage and opening the Applyr dashboard
 */

// ── DOM Elements ────────────────────────────────────────────────────────────

const btnParse = document.getElementById("btn-parse");
const btnParseText = document.getElementById("btn-parse-text");
const btnSpinner = document.getElementById("btn-spinner");
const btnSend = document.getElementById("btn-send");

const statusEl = document.getElementById("status");
const statusIcon = document.getElementById("status-icon");
const statusText = document.getElementById("status-text");

const resultsEl = document.getElementById("results");
const resultCompany = document.getElementById("result-company");
const resultSource = document.getElementById("result-source");
const resultTitle = document.getElementById("result-title");
const resultLocationText = document.getElementById("result-location-text");
const resultLocationEl = document.getElementById("result-location");
const resultWorkTypeText = document.getElementById("result-work-type-text");
const resultWorkTypeEl = document.getElementById("result-work-type");
const resultSalaryText = document.getElementById("result-salary-text");
const resultSalaryEl = document.getElementById("result-salary");
const resultTechs = document.getElementById("result-techs");
const resultTechsWrapper = document.getElementById("result-techs-wrapper");

// ── State ───────────────────────────────────────────────────────────────────

let parsedData = null;

// ── UI Helpers ──────────────────────────────────────────────────────────────

function showStatus(type, icon, message) {
  statusEl.className = `status ${type}`;
  statusIcon.textContent = icon;
  statusText.textContent = message;
  statusEl.classList.remove("hidden");
}

function hideStatus() {
  statusEl.classList.add("hidden");
}

function showLoading() {
  btnParseText.textContent = "Parsing…";
  btnSpinner.classList.remove("hidden");
  btnParse.disabled = true;
}

function hideLoading() {
  btnParseText.textContent = "Parse This Page";
  btnSpinner.classList.add("hidden");
  btnParse.disabled = false;
}

function displayResults(data) {
  parsedData = data;

  // Company
  resultCompany.textContent = data.company || "Unknown Company";

  // Source badge
  resultSource.textContent = data.source || "PARSED";

  // Title
  resultTitle.textContent = data.title || "Untitled Position";

  // Location
  if (data.location) {
    resultLocationText.textContent = data.location;
    resultLocationEl.classList.remove("hidden");
  } else {
    resultLocationEl.classList.add("hidden");
  }

  // Work type
  if (data.workType) {
    resultWorkTypeText.textContent = data.workType;
    resultWorkTypeEl.classList.remove("hidden");
  } else {
    resultWorkTypeEl.classList.add("hidden");
  }

  // Salary
  if (data.salary) {
    resultSalaryText.textContent = data.salary;
    resultSalaryEl.classList.remove("hidden");
  } else {
    resultSalaryEl.classList.add("hidden");
  }

  // Tech tags
  resultTechs.innerHTML = "";
  if (data.techStacks) {
    const techs = data.techStacks.split(",").map((t) => t.trim()).filter(Boolean);
    if (techs.length > 0) {
      techs.forEach((tech) => {
        const tag = document.createElement("span");
        tag.className = "tech-tag";
        tag.textContent = tech;
        resultTechs.appendChild(tag);
      });
      resultTechsWrapper.classList.remove("hidden");
    } else {
      resultTechsWrapper.classList.add("hidden");
    }
  } else {
    resultTechsWrapper.classList.add("hidden");
  }

  resultsEl.classList.remove("hidden");
  btnSend.classList.remove("hidden");
  btnSend.disabled = false;
}

// ── Parse Button Handler ────────────────────────────────────────────────────

btnParse.addEventListener("click", async () => {
  hideStatus();
  resultsEl.classList.add("hidden");
  btnSend.classList.add("hidden");
  showLoading();

  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      showStatus("error", "⚠️", "Could not access the current tab.");
      hideLoading();
      return;
    }

    // Check that the tab has a valid URL (not chrome://, chrome-extension://, etc.)
    if (!tab.url || (!tab.url.startsWith("http://") && !tab.url.startsWith("https://"))) {
      showStatus("error", "⚠️", "This page can't be parsed. Navigate to a job posting first.");
      hideLoading();
      return;
    }

    // Send message to content script to parse the page
    chrome.tabs.sendMessage(tab.id, { action: "PARSE_JOB" }, (response) => {
      hideLoading();

      if (chrome.runtime.lastError) {
        showStatus(
          "error",
          "⚠️",
          "Could not connect to the page. Try refreshing it first."
        );
        return;
      }

      if (!response || response.error) {
        showStatus(
          "error",
          "⚠️",
          response?.error || "Failed to parse this page. It may not be a job posting."
        );
        return;
      }

      if (!response.title && !response.company && !response.description) {
        showStatus(
          "error",
          "🤷",
          "No job details found on this page. Make sure you're on a job posting."
        );
        return;
      }

      showStatus("success", "✅", "Job details extracted successfully!");
      displayResults(response);
    });
  } catch (err) {
    hideLoading();
    showStatus("error", "❌", "An unexpected error occurred: " + err.message);
  }
});

// ── Send to Applyr Button Handler ───────────────────────────────────────────

btnSend.addEventListener("click", async () => {
  if (!parsedData) return;

  btnSend.disabled = true;

  try {
    // Get the current tab URL to include as jobUrl
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const payload = {
      ...parsedData,
      jobUrl: tab?.url || parsedData.jobUrl || "",
      _applyr_source: "extension",
      _applyr_timestamp: Date.now(),
    };

    // We need to set localStorage on the Applyr app's origin.
    // We do this by opening the app URL with a hash parameter, 
    // then using the content script or a direct approach.
    // Simplest: open the app with the data encoded in the URL hash.
    const encodedData = encodeURIComponent(JSON.stringify(payload));
    const applyrUrl = `http://localhost:3000/dashboard/applications?action=new-parsed&data=${encodedData}`;

    // Open the Applyr dashboard
    await chrome.tabs.create({ url: applyrUrl });

    showStatus("success", "🚀", "Sent to Applyr! Check your dashboard.");
    btnSend.disabled = true;
  } catch (err) {
    showStatus("error", "❌", "Failed to open Applyr: " + err.message);
    btnSend.disabled = false;
  }
});
