// metacode.js

// Metacode commands with replacements or functions
const META_CODES = {
  "trust-circle:trusted": "🟢",  // green circle
  "trust-circle:caution": "🟡",  // yellow circle
  "trust-circle:untrusted": "🔴", // red circle

  "trust.boost": "🚀 Trust Boost Activated!",
  "dev.hello": "👋 Hello Developer!",
  "dev.warning": "⚠️ Warning: Debug Mode Enabled",
  "dev.hint": "💡 Hint: Use Ctrl+S to save your notes",

  // reset command: restore welcome note content
  "reset.Blacklink": () => {
    const welcomeContent = `
      <h2>👋 Welcome to <strong>Note25</strong>!</h2>
      <p>Your simple, powerful note-taking app by Blacklink Education.</p>
      <ul>
        <li>Use the <b>toolbar</b> above to format your text: bold, italic, lists, and more!</li>
        <li>Click <b>+ New Note</b> to create as many notes as you want — organize your thoughts your way.</li>
        <li>Pin important notes with the 📌 button to keep them handy.</li>
        <li>Search your notes quickly with the search box.</li>
        <li>Everything is saved automatically in your browser — no internet needed.</li>
      </ul>
      <h3>🚀 What’s New in Note25:</h3>
      <ul>
        <li>🆕 Added emoji quick-add to note titles for fun and flair.</li>
        <li>🔍 Integrated Trust sidebar for searching verified trusted sources.</li>
        <li>📁 Gallery view to browse all your notes visually (coming soon!).</li>
        <li>🛠️ Improved autosave and localStorage reliability.</li>
      </ul>
      <p>Thanks for using Note25 — happy writing and stay awesome! ✍️✨</p>
    `;

    const noteArea = document.getElementById("noteArea");
    const currentNoteTitle = document.getElementById("currentNoteTitle");

    if (!noteArea || !currentNoteTitle) return;

    // Replace content and title
    noteArea.innerHTML = welcomeContent;
    currentNoteTitle.textContent = "Welcome to Note25";

    // Update currentNote object if exists
    if (typeof currentNote !== "undefined" && currentNote) {
      currentNote.content = welcomeContent;
      currentNote.title = "Welcome to Note25";
      if (typeof saveNotesToStorage === "function") saveNotesToStorage();
    }
  },

  // Added full function key support for reset with subcommand
  "reset.Blacklink.function.Welcome": () => {
    // Just call the same reset.Blacklink to keep DRY
    META_CODES["reset.Blacklink"]();
  }
};


// Function to parse metacode in a given text string
function parseMetaCodeString(text) {
  // Replace all {...} blocks with their replacement or call functions
  return text.replace(/\{([^}]+)\}/g, (match, cmd) => {
    const replacement = META_CODES[cmd];
    if (typeof replacement === "function") {
      // If function, call it and return empty string (function does UI update)
      replacement();
      return "";
    } else if (typeof replacement === "string") {
      return replacement;
    } else {
      // Unknown command, leave as-is
      return match;
    }
  });
}

// Function to parse metacodes inside #noteArea content
function parseMetaCodeInEditor() {
  const noteArea = document.getElementById("noteArea");
  if (!noteArea) return;

  // Get the HTML content as string
  let content = noteArea.innerHTML;

  // Parse and replace metacodes inside content
  const newContent = parseMetaCodeString(content);

  if (newContent !== content) {
    noteArea.innerHTML = newContent;

    // Update currentNote content and save
    if (typeof currentNote !== "undefined" && currentNote) {
      currentNote.content = newContent;
      if (typeof saveNotesToStorage === "function") saveNotesToStorage();
    }
  }
}

// Attach keydown listener to parse on Enter keypress inside noteArea
document.addEventListener("DOMContentLoaded", () => {
  const noteArea = document.getElementById("noteArea");
  if (!noteArea) return;

  noteArea.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      // Optional: prevent default newline if you want to control formatting
      // e.preventDefault();

      // Delay to let content update, then parse metacode
      setTimeout(() => {
        parseMetaCodeInEditor();
      }, 0);
    }
  });
});