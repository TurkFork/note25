const TRUST_SITES = [
  { domain: "blacklink.net", level: "green", url: "https://blacklink.net" },
  { domain: "verifieded.net", level: "green", url: "https://verifieded.net" },
  { domain: "khanacademy.org", level: "green", url: "https://khanacademy.org" },
  { domain: "britannica.com", level: "yellow", url: "https://britannica.com" },
  { domain: "wikipedia.org", level: "yellow", url: "https://wikipedia.org" },

  { domain: "nasa.gov", level: "green", url: "https://nasa.gov" },
  { domain: "cdc.gov", level: "green", url: "https://cdc.gov" },
  { domain: "who.int", level: "green", url: "https://who.int" },
  { domain: "nationalgeographic.com", level: "green", url: "https://nationalgeographic.com" },
  { domain: "libraryofcongress.gov", level: "green", url: "https://loc.gov" },
  { domain: "discoveryeducation.com", level: "yellow", url: "https://discoveryeducation.com" },
  { domain: "theguardian.com", level: "yellow", url: "https://theguardian.com" },
  { domain: "reuters.com", level: "yellow", url: "https://reuters.com" },

  { domain: "naturalnews.com", level: "red", url: "https://naturalnews.com" },
  { domain: "realrawnews.com", level: "red", url: "https://realrawnews.com" }
];

const TRUST_COLORS = {
  green: "🟢",
  yellow: "🟡",
  red: "🔴"
};

// Replace these with your actual Google API key and CSE ID:
const GOOGLE_API_KEY = "AIzaSyCeSWrzf5PJoBWuPFaEazNWixcXJP-tIUE";
const GOOGLE_CSE_ID = "e752055fac08d4bc9"; // your custom search engine ID

function toggleTrustSidebar() {
  const sidebar = document.getElementById("trustSidebar");
  const noteArea = document.getElementById("noteArea");
  const noteTitle = document.getElementById("currentNoteTitle");
  const toolbar = document.querySelector(".toolbar");

  if (!sidebar || !noteArea || !toolbar || !noteTitle) return;

  if (sidebar.style.display === "block") {
    sidebar.style.display = "none";
    noteArea.style.display = "block";
    noteTitle.style.display = "block";
    toolbar.style.display = "flex";
  } else {
    sidebar.style.display = "block";
    noteArea.style.display = "none";
    noteTitle.style.display = "none";
    toolbar.style.display = "flex";
  }
}

async function searchTrust() {
  const query = document.getElementById("trustSearchInput").value.trim();
  const results = document.getElementById("trustResults");
  if (!query) {
    results.innerHTML = "⚠️ Enter a valid query.";
    return;
  }

  results.innerHTML = `<em>Searching Google Custom Search for "${query}"...</em>`;

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      results.innerHTML = "<em>No results found.</em>";
      return;
    }

    let html = "";

    // Loop through search results
    data.items.forEach(item => {
      const link = item.link || "";
      // Find if the link's domain matches a trusted site
      const matchedSite = TRUST_SITES.find(site => link.includes(site.domain));

      // Only show if matched to trusted site
      if (matchedSite) {
        html += `
          <div class="trust-result" style="margin-bottom: 12px;">
            <span class="trust-level">${TRUST_COLORS[matchedSite.level]}</span>
            <strong>${matchedSite.domain}</strong> &mdash; 
            <a href="${link}" target="_blank" rel="noopener noreferrer">${link}</a><br/>
            <div>${item.snippet}</div>
            <button onclick="insertTrustSnippet('${item.snippet.replace(/'/g, "\\'")}', '${matchedSite.domain}')">Insert</button>
          </div>
        `;
      }
    });

    if (!html) html = "<em>No trusted results found.</em>";

    results.innerHTML = html;

  } catch (err) {
    results.innerHTML = `<span style="color: red;">Error: ${err.message}</span>`;
  }
}

function insertTrustSnippet(text, source) {
  const noteArea = document.getElementById("noteArea");
  const editor = document.querySelector("main.editor");
  const sidebar = document.getElementById("trustSidebar");

  const span = document.createElement("span");
  span.innerHTML = `${text} <span style="font-size:0.75rem; color:gray;">[source: ${source}]</span><br><br>`;
  noteArea.appendChild(span);

  if (typeof currentNote !== "undefined" && currentNote) {
    currentNote.content = noteArea.innerHTML;
    saveNotesToStorage();
  }

  sidebar.style.display = "none";
  editor.style.display = "block";
}
function toggleTrustSidebar() {
  const sidebar = document.getElementById("trustSidebar");
  const noteArea = document.getElementById("noteArea");
  const noteTitle = document.getElementById("currentNoteTitle");
  const toolbar = document.querySelector(".toolbar");

  if (!sidebar || !noteArea || !toolbar || !noteTitle) return;

  if (sidebar.style.display === "block") {
    // Hide sidebar, show note editor parts
    sidebar.style.display = "none";
    noteArea.style.display = "block";
    noteTitle.style.display = "block";
    toolbar.style.display = "flex"; // keep toolbar visible always
  } else {
    // Show sidebar, hide note editor parts, keep toolbar visible
    sidebar.style.display = "block";
    noteArea.style.display = "none";
    noteTitle.style.display = "none";
    toolbar.style.display = "flex";
  }
}