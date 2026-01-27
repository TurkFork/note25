const DEFAULT_SETTINGS = {
  theme: 'aurora',
  autosaveEnabled: true,
  autosaveInterval: 30000,
  defaultProjectType: 'document',
  compactCards: false,
  customAccentEnabled: false,
  customAccent: '#f59e0b',
  homeSections: ['quick-actions', 'recent-projects']
};

// Note26 uses the public Note26-only Aero API (no internal keys in the browser).
const AERO_BASE_URL = 'https://note.aero.blacklink.net';

const NOTE26_WELCOME_PROJECT_ID = 'welcome-note26';
const NOTE26_WELCOME_FLAG = 'note26_welcome_created_v1';

const NOTE26_WELCOME_DOC_CONTENT = `
  <h1>Welcome to Note26</h1>
  <p><strong>Note26</strong> is your workspace for documents, notes, presentations, and spreadsheets — built to feel fast, clean, and offline-friendly.</p>

  <h2>What’s new</h2>
  <ul>
    <li><strong>Aero tools (built-in):</strong> Summarize, rewrite, explain, and generate study questions from your content.</li>
    <li><strong>Document upgrades:</strong> Insert images and vectors (SVG) right into documents, plus paste/drag-and-drop media.</li>
    <li><strong>Outline + insights:</strong> Headings outline, word count, reading time, and quick stats.</li>
    <li><strong>Projects dashboard:</strong> Create and organize different project types with templates and quick actions.</li>
    <li><strong>Autosave + export:</strong> Save automatically and export projects for backup or sharing.</li>
  </ul>

  <h2>Try Aero</h2>
  <ol>
    <li>Open any project with content.</li>
    <li>Click <strong>Aero</strong> in the toolbar.</li>
    <li>Choose an action like <em>Summarize</em> or <em>Study Questions</em>.</li>
  </ol>
  <p><em>Tip:</em> In documents, select text and right‑click to “Summarize with Aero”.</p>

  <h2>Insert images + vectors</h2>
  <ul>
    <li>Use the <strong>Image</strong> button to add PNG/JPG/GIF/WebP.</li>
    <li>Use the <strong>Vector</strong> button to add SVG files.</li>
    <li>You can also <strong>paste</strong> images from your clipboard or <strong>drag &amp; drop</strong> files into the document.</li>
  </ul>

  <hr class="doc-divider">
  <p class="doc-timestamp">Created: ${new Date().toLocaleString()}</p>
`;

const DEFAULT_FILTERS = {
  search: '',
  sort: 'recent'
};

const state = {
  projects: [],
  currentProject: null,
  view: 'home',
  settings: { ...DEFAULT_SETTINGS },
  projectFilters: { ...DEFAULT_FILTERS },
  aero: {
    statusMessage: 'Status: Checking Aero availability...',
    banned: false
  },
  ui: {
    activeSlideIndex: 0,
    activeElementId: null,
    activeCell: null,
    draggingElement: null,
    resizingElement: null,
    isFullscreen: false
  }
};

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Template Library
const TEMPLATES = {
  document: [
    {
      id: 'meeting-notes',
      name: 'Meeting Notes',
      description: 'Structured template for meeting minutes',
      content: `<h1>Meeting Notes</h1>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
<p><strong>Attendees:</strong> </p>
<p><strong>Agenda:</strong></p>
<ul>
<li>Item 1</li>
<li>Item 2</li>
<li>Item 3</li>
</ul>

<h2>Discussion Points</h2>
<p></p>

<h2>Action Items</h2>
<ul>
<li>[ ] Task 1 - Assigned to: </li>
<li>[ ] Task 2 - Assigned to: </li>
</ul>

<h2>Next Steps</h2>
<p></p>`
    },
    {
      id: 'project-proposal',
      name: 'Project Proposal',
      description: 'Professional project proposal template',
      content: `<h1>Project Proposal</h1>
<p><strong>Project Name:</strong> </p>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
<p><strong>Prepared by:</strong> </p>

<h2>Executive Summary</h2>
<p>Brief overview of the project, objectives, and expected outcomes.</p>

<h2>Problem Statement</h2>
<p>Description of the problem or opportunity this project addresses.</p>

<h2>Proposed Solution</h2>
<p>Detailed explanation of the proposed approach and methodology.</p>

<h2>Timeline</h2>
<ul>
<li>Phase 1: </li>
<li>Phase 2: </li>
<li>Phase 3: </li>
</ul>

<h2>Budget & Resources</h2>
<p></p>

<h2>Expected Outcomes</h2>
<p></p>`
    },
    {
      id: 'essay',
      name: 'Essay / Report',
      description: 'Academic essay or report structure',
      content: `<h1>Essay Title</h1>
<p><strong>Author:</strong> </p>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>

<h2>Abstract</h2>
<p>Brief summary of the essay's main argument and findings.</p>

<h2>Introduction</h2>
<p>Introduce the topic, provide background context, and state your thesis.</p>

<h2>Body</h2>
<h3>Point 1</h3>
<p>First major argument or section.</p>

<h3>Point 2</h3>
<p>Second major argument or section.</p>

<h3>Point 3</h3>
<p>Third major argument or section.</p>

<h2>Conclusion</h2>
<p>Summarize your arguments and restate the thesis in light of the evidence presented.</p>

<h2>References</h2>
<ul>
<li></li>
</ul>`
    },
    {
      id: 'study-notes',
      name: 'Study Notes',
      description: 'Organized study notes template',
      content: `<h1>Study Notes</h1>
<p><strong>Subject:</strong> </p>
<p><strong>Topic:</strong> </p>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>

<h2>Key Concepts</h2>
<ul>
<li><strong>Concept 1:</strong> Definition and explanation</li>
<li><strong>Concept 2:</strong> Definition and explanation</li>
<li><strong>Concept 3:</strong> Definition and explanation</li>
</ul>

<h2>Important Formulas/Rules</h2>
<p></p>

<h2>Examples</h2>
<p><strong>Example 1:</strong></p>
<p></p>

<h2>Practice Questions</h2>
<ol>
<li>Question 1</li>
<li>Question 2</li>
<li>Question 3</li>
</ol>

<h2>Summary</h2>
<p>Quick recap of the most important points to remember.</p>`
    },
    {
      id: 'blog-post',
      name: 'Blog Post',
      description: 'Blog article template',
      content: `<h1>Blog Post Title</h1>
<p><em>Published: ${new Date().toLocaleDateString()}</em></p>

<p><strong>Introduction hook:</strong> Start with an engaging opening that captures attention.</p>

<h2>The Problem/Question</h2>
<p>What problem are you solving or question are you answering?</p>

<h2>Your Insight</h2>
<p>Share your unique perspective or solution.</p>

<h2>Detailed Explanation</h2>
<p>Break down your main points:</p>
<ul>
<li>Point 1</li>
<li>Point 2</li>
<li>Point 3</li>
</ul>

<h2>Examples & Stories</h2>
<p>Real-world examples or case studies.</p>

<h2>Takeaway</h2>
<p>What should readers remember or do next?</p>

<p><strong>Call to Action:</strong> </p>`
    }
  ],
  presentation: [
    {
      id: 'pitch-deck',
      name: 'Startup Pitch Deck',
      description: '10-slide investor pitch template',
      slides: [
        {
          title: 'Company Name',
          content: 'Your tagline or mission statement',
          elements: []
        },
        {
          title: 'The Problem',
          content: 'What problem are you solving? Why does it matter?',
          elements: []
        },
        {
          title: 'The Solution',
          content: 'How does your product/service solve this problem?',
          elements: []
        },
        {
          title: 'Market Opportunity',
          content: 'Market size, growth potential, and target audience',
          elements: []
        },
        {
          title: 'Product Demo',
          content: 'Show your product in action',
          elements: []
        },
        {
          title: 'Business Model',
          content: 'How do you make money?',
          elements: []
        },
        {
          title: 'Traction',
          content: 'Key metrics, milestones, and achievements',
          elements: []
        },
        {
          title: 'Competition',
          content: 'Competitive landscape and your advantages',
          elements: []
        },
        {
          title: 'Team',
          content: 'Meet the founding team and key advisors',
          elements: []
        },
        {
          title: 'The Ask',
          content: 'Funding request and use of funds',
          elements: []
        }
      ]
    },
    {
      id: 'project-presentation',
      name: 'Project Presentation',
      description: 'General project presentation structure',
      slides: [
        {
          title: 'Project Title',
          content: 'Presented by: [Your Name]',
          elements: []
        },
        {
          title: 'Overview',
          content: 'Brief introduction to the project and objectives',
          elements: []
        },
        {
          title: 'Background',
          content: 'Context and problem statement',
          elements: []
        },
        {
          title: 'Approach',
          content: 'Methodology and strategy',
          elements: []
        },
        {
          title: 'Results',
          content: 'Key findings and outcomes',
          elements: []
        },
        {
          title: 'Next Steps',
          content: 'Future plans and recommendations',
          elements: []
        },
        {
          title: 'Thank You',
          content: 'Questions?',
          elements: []
        }
      ]
    },
    {
      id: 'class-lecture',
      name: 'Class Lecture',
      description: 'Educational lecture template',
      slides: [
        {
          title: 'Lesson Title',
          content: 'Class name and date',
          elements: []
        },
        {
          title: 'Learning Objectives',
          content: 'What students will learn today',
          elements: []
        },
        {
          title: 'Warm-up Activity',
          content: 'Engage students with a quick activity',
          elements: []
        },
        {
          title: 'Main Concept',
          content: 'Core lesson content',
          elements: []
        },
        {
          title: 'Examples',
          content: 'Worked examples and demonstrations',
          elements: []
        },
        {
          title: 'Practice',
          content: 'Student practice problems or activities',
          elements: []
        },
        {
          title: 'Summary',
          content: 'Review key takeaways',
          elements: []
        },
        {
          title: 'Homework',
          content: 'Assignment and next class preview',
          elements: []
        }
      ]
    }
  ],
  spreadsheet: [
    {
      id: 'budget-tracker',
      name: 'Budget Tracker',
      description: 'Personal or project budget template',
      data: {
        columns: ['Category', 'Budgeted', 'Actual', 'Difference', 'Notes'],
        rows: [
          ['Income', '', '', '=C2-B2', ''],
          ['Housing', '', '', '=C3-B3', ''],
          ['Transportation', '', '', '=C4-B4', ''],
          ['Food', '', '', '=C5-B5', ''],
          ['Utilities', '', '', '=C6-B6', ''],
          ['Entertainment', '', '', '=C7-B7', ''],
          ['Savings', '', '', '=C8-B8', ''],
          ['Other', '', '', '=C9-B9', ''],
          ['Total', '=SUM(B2:B9)', '=SUM(C2:C9)', '=C10-B10', '']
        ]
      }
    },
    {
      id: 'project-timeline',
      name: 'Project Timeline',
      description: 'Track project tasks and deadlines',
      data: {
        columns: ['Task', 'Assigned To', 'Start Date', 'Due Date', 'Status', 'Priority'],
        rows: [
          ['Task 1', '', '', '', 'Not Started', 'High'],
          ['Task 2', '', '', '', 'Not Started', 'Medium'],
          ['Task 3', '', '', '', 'Not Started', 'Low'],
          ['Task 4', '', '', '', 'Not Started', 'Medium'],
          ['Task 5', '', '', '', 'Not Started', 'High']
        ]
      }
    },
    {
      id: 'grade-tracker',
      name: 'Grade Tracker',
      description: 'Student grade tracking template',
      data: {
        columns: ['Assignment', 'Points Possible', 'Points Earned', 'Percentage', 'Weight', 'Weighted %'],
        rows: [
          ['Homework 1', '100', '', '=C2/B2*100', '0.2', '=D2*E2'],
          ['Homework 2', '100', '', '=C3/B3*100', '0.2', '=D3*E3'],
          ['Midterm', '200', '', '=C4/B4*100', '0.3', '=D4*E4'],
          ['Final Project', '300', '', '=C5/B5*100', '0.3', '=D5*E5'],
          ['Total Grade', '', '', '', '', '=SUM(F2:F5)']
        ]
      }
    },
    {
      id: 'inventory',
      name: 'Inventory List',
      description: 'Track items and quantities',
      data: {
        columns: ['Item', 'Category', 'Quantity', 'Unit Price', 'Total Value', 'Reorder Level'],
        rows: [
          ['Item 1', '', '', '', '=C2*D2', ''],
          ['Item 2', '', '', '', '=C3*D3', ''],
          ['Item 3', '', '', '', '=C4*D4', ''],
          ['Item 4', '', '', '', '=C5*D5', ''],
          ['Total Value', '', '', '', '=SUM(E2:E5)', '']
        ]
      }
    }
  ],
  notes: [
    {
      id: 'daily-todo',
      name: 'Daily To-Do',
      description: 'Daily task list',
      notes: [
        { color: '#ef4444', content: 'High Priority Tasks:\n- \n- \n- ', pinned: true },
        { color: '#f59e0b', content: 'Medium Priority:\n- \n- ', pinned: false },
        { color: '#10b981', content: 'Completed:\n- ', pinned: false }
      ]
    },
    {
      id: 'brainstorm',
      name: 'Brainstorm Board',
      description: 'Creative brainstorming layout',
      notes: [
        { color: '#6366f1', content: 'Main Idea', pinned: true },
        { color: '#8b5cf6', content: 'Sub-idea 1', pinned: false },
        { color: '#ec4899', content: 'Sub-idea 2', pinned: false },
        { color: '#14b8a6', content: 'Sub-idea 3', pinned: false },
        { color: '#f59e0b', content: 'Questions to explore', pinned: false }
      ]
    },
    {
      id: 'weekly-planning',
      name: 'Weekly Planning',
      description: 'Plan your week',
      notes: [
        { color: '#ef4444', content: 'Monday\n- \n- ', pinned: true },
        { color: '#f59e0b', content: 'Tuesday\n- \n- ', pinned: true },
        { color: '#10b981', content: 'Wednesday\n- \n- ', pinned: true },
        { color: '#3b82f6', content: 'Thursday\n- \n- ', pinned: true },
        { color: '#8b5cf6', content: 'Friday\n- \n- ', pinned: true },
        { color: '#64748b', content: 'Goals for the week', pinned: false }
      ]
    }
  ]
};

function bootstrap() {
  loadSettings();
  applySettings();
  detectSafariClass();
  init();
  setupEventBindings();
}

document.addEventListener('DOMContentLoaded', () => {
  const readiness = window.partialsReady || Promise.resolve();
  readiness.then(bootstrap);
});

['fullscreenchange', 'webkitfullscreenchange'].forEach(eventName => {
  document.addEventListener(eventName, () => {
    state.ui.isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
    updateFullscreenButton();
  });
});

function detectSafariClass() {
  if (isSafari) {
    document.body.classList.add('is-safari');
  }
}

function loadSettings() {
  try {
    const saved = localStorage.getItem('note26_settings');
    if (saved) {
      state.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.warn('Failed to load settings', error);
    state.settings = { ...DEFAULT_SETTINGS };
  }
}

function persistSettings() {
  localStorage.setItem('note26_settings', JSON.stringify(state.settings));
}

function applySettings() {
  document.body.dataset.theme = state.settings.theme || 'aurora';
  applyAccentColor();
  applyCompactLayout();
  updateAutoSaveTimer();
  renderHomeInsights();
  if (!state.settings.autosaveEnabled) {
    setSaveStatus('Autosave paused', 'paused');
  }
}

function applyAccentColor() {
  if (state.settings.customAccentEnabled && state.settings.customAccent) {
    const accent = state.settings.customAccent;
    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.style.setProperty('--accent-secondary', generateAccentSecondary(accent));
  } else {
    document.documentElement.style.removeProperty('--accent');
    document.documentElement.style.removeProperty('--accent-secondary');
  }
}

function applyCompactLayout() {
  const grid = document.getElementById('projects-grid');
  if (grid) {
    grid.classList.toggle('compact', !!state.settings.compactCards);
  }
}

function init() {
  loadProjects();
  const changed = ensureWelcomeProject();
  if (changed) {
    saveProjects();
  } else {
    renderProjects();
  }
  renderHomeSections();
  setView('home');
}

function loadProjects() {
  const saved = localStorage.getItem('note26_projects');
  if (saved) {
    try {
      state.projects = JSON.parse(saved);
    } catch (error) {
      console.error('Failed to parse projects', error);
      state.projects = [];
    }
  }
}

function ensureWelcomeProject() {
  const exists = state.projects.some(project => project?.id === NOTE26_WELCOME_PROJECT_ID);
  const flag = localStorage.getItem(NOTE26_WELCOME_FLAG);

  if (exists) {
    if (!flag) localStorage.setItem(NOTE26_WELCOME_FLAG, '1');
    return false;
  }

  if (flag) {
    return false;
  }

  const project = {
    id: NOTE26_WELCOME_PROJECT_ID,
    name: 'Welcome to Note26',
    type: 'document',
    created: Date.now(),
    lastModified: Date.now(),
    data: { content: NOTE26_WELCOME_DOC_CONTENT }
  };

  state.projects.unshift(project);
  localStorage.setItem(NOTE26_WELCOME_FLAG, '1');
  return true;
}

function saveProjects() {
  localStorage.setItem('note26_projects', JSON.stringify(state.projects));
  renderProjects();
}

function setView(view) {
  state.view = view;
  const app = document.getElementById('app');
  const sidebar = document.getElementById('sidebar');
  const home = document.getElementById('home-page');
  const workspace = document.getElementById('workspace');
  const settings = document.getElementById('settings-page');

  if (view === 'workspace') {
    app.classList.remove('home-view');
    sidebar.style.display = 'flex';
    home.style.display = 'none';
    workspace.style.display = 'flex';
    settings.style.display = 'none';
    settings.classList.remove('active');
  } else if (view === 'settings') {
    app.classList.add('home-view');
    sidebar.style.display = 'none';
    home.style.display = 'none';
    workspace.style.display = 'none';
    settings.style.display = 'flex';
    settings.classList.add('active');
    renderSettingsPage();
  } else {
    app.classList.add('home-view');
    sidebar.style.display = 'none';
    home.style.display = 'block';
    workspace.style.display = 'none';
    settings.style.display = 'none';
    settings.classList.remove('active');
  }
}

function renderProjects() {
  const container = document.getElementById('projects-grid');
  if (!container) return;

  applyCompactLayout();
  const projectCountEl = document.getElementById('project-count');
  if (projectCountEl) {
    const label = state.projects.length === 1 ? 'project' : 'projects';
    projectCountEl.textContent = `${state.projects.length} ${label}`;
  }

  const filteredProjects = getFilteredProjects();
  const hasProjects = state.projects.length > 0;

  if (!filteredProjects.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <i class="fas fa-folder-open"></i>
        <h3>${hasProjects ? 'No matches' : 'No projects yet'}</h3>
        <p>${hasProjects ? 'Try another search or reset filters.' : 'Create your first project to get started'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredProjects.map(project => {
    const icon = {
      presentation: 'fa-presentation-screen',
      document: 'fa-file-alt',
      spreadsheet: 'fa-table',
      notes: 'fa-sticky-note'
    }[project.type] || 'fa-file';

    const itemCount = {
      presentation: project.data.slides?.length || 0,
      document: 1,
      spreadsheet: project.data.sheet?.length || 0,
      notes: project.data.notes?.length || 0
    }[project.type] || 0;

    const itemLabel = {
      presentation: 'slides',
      document: 'document',
      spreadsheet: 'rows',
      notes: 'notes'
    }[project.type] || 'items';

    return `
      <div class="project-card" onclick="openProject('${project.id}')">
        <div class="project-header">
          <div class="project-icon">
            <i class="fas ${icon}"></i>
          </div>
          <div class="project-actions">
            <button class="btn btn-icon btn-ghost" onclick="duplicateProject('${project.id}'); event.stopPropagation();" title="Duplicate">
              <i class="fas fa-copy"></i>
            </button>
            <button class="btn btn-icon btn-ghost" onclick="deleteProject('${project.id}'); event.stopPropagation();" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        <div class="project-title">${project.name}</div>
        <div class="project-meta">
          <span><i class="fas fa-clock"></i> ${formatDate(project.lastModified)}</span>
        </div>
        <div class="project-stats">
          <div class="stat">
            <i class="fas fa-file"></i>
            <span>${itemCount} ${itemLabel}</span>
          </div>
          <div class="stat">
            <i class="fas fa-tag"></i>
            <span>${project.type}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  renderHomeInsights();
}

function renderHomeSections() {
  const homePage = document.getElementById('home-page');
  if (!homePage) return;

  const sections = state.settings.homeSections || ['quick-actions', 'recent-projects'];

  const mainContent = homePage.querySelector('.home-page');
  if (!mainContent) return;

  // Find section headers and their associated content
  const allSections = Array.from(mainContent.children);
  const quickActionsStart = allSections.findIndex(el =>
    el.classList?.contains('section-header') && el.textContent.includes('Quick Actions')
  );
  const recentProjectsStart = allSections.findIndex(el =>
    el.classList?.contains('section-header') && el.textContent.includes('Recent Projects')
  );

  if (quickActionsStart === -1 || recentProjectsStart === -1) return;

  // Extract sections (header + content)
  const quickActions = allSections.slice(quickActionsStart, quickActionsStart + 2); // header + quick-actions div
  const recentProjects = allSections.slice(recentProjectsStart, recentProjectsStart + 2); // header + projects-grid

  const sectionMap = {
    'quick-actions': quickActions,
    'recent-projects': recentProjects
  };

  // Remove sections
  [...quickActions, ...recentProjects].forEach(el => el.remove());

  // Re-insert in order
  sections.forEach(sectionId => {
    const sectionEls = sectionMap[sectionId];
    if (sectionEls) {
      sectionEls.forEach(el => {
        mainContent.appendChild(el);
      });
    }
  });
}

function renderHomeInsights() {
  const totalEl = document.getElementById('insight-projects');
  const lastEditEl = document.getElementById('insight-last-edit');
  const autosaveEl = document.getElementById('insight-autosave');
  const intervalEl = document.getElementById('insight-interval');
  const aeroStatusEl = document.getElementById('insight-aero-status');

  if (!totalEl && !lastEditEl && !autosaveEl && !intervalEl && !aeroStatusEl) {
    return;
  }

  if (totalEl) {
    totalEl.textContent = state.projects.length.toString();
  }

  if (lastEditEl) {
    const latest = state.projects.reduce((acc, project) => Math.max(acc, project.lastModified || 0), 0);
    lastEditEl.textContent = latest ? `Last edit ${formatDate(latest)}` : 'No edits yet';
  }

  if (autosaveEl) {
    autosaveEl.textContent = state.settings.autosaveEnabled ? 'On' : 'Off';
  }

  if (intervalEl) {
    intervalEl.textContent = state.settings.autosaveEnabled
      ? `Every ${Math.round(state.settings.autosaveInterval / 1000)}s`
      : 'Paused';
  }

  if (aeroStatusEl) {
    aeroStatusEl.textContent = state.aero.statusMessage || 'Status: Checking Aero availability...';
  }
}

function getFilteredProjects() {
  let projects = [...state.projects];
  const search = state.projectFilters.search.trim().toLowerCase();

  if (search) {
    projects = projects.filter(project =>
      project.name.toLowerCase().includes(search) ||
      project.type.toLowerCase().includes(search)
    );
  }

  switch (state.projectFilters.sort) {
    case 'name':
      projects.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'type':
      projects.sort((a, b) => {
        const diff = a.type.localeCompare(b.type);
        return diff !== 0 ? diff : b.lastModified - a.lastModified;
      });
      break;
    default:
      projects.sort((a, b) => b.lastModified - a.lastModified);
      break;
  }

  return projects;
}

function openNewProjectModal() {
  document.getElementById('new-project-modal').classList.add('open');
  const nameInput = document.getElementById('new-project-name');
  const typeSelect = document.getElementById('new-project-type');
  if (nameInput) {
    nameInput.value = '';
    nameInput.focus();
  }
  if (typeSelect) {
    typeSelect.value = state.settings.defaultProjectType || 'document';
  }
  updateTemplateOptions();
}

function closeNewProjectModal() {
  document.getElementById('new-project-modal').classList.remove('open');
  document.getElementById('new-project-name').value = '';
  document.getElementById('new-project-template').value = '';
}

function updateTemplateOptions() {
  const typeSelect = document.getElementById('new-project-type');
  const templateSelect = document.getElementById('new-project-template');

  if (!typeSelect || !templateSelect) return;

  const type = typeSelect.value;
  const templates = TEMPLATES[type] || [];

  // Clear existing options except the first "Blank Project" option
  templateSelect.innerHTML = '<option value="">Blank Project</option>';

  // Add templates for this type
  templates.forEach(template => {
    const option = document.createElement('option');
    option.value = template.id;
    option.textContent = `${template.name} - ${template.description}`;
    templateSelect.appendChild(option);
  });
}

function toggleTheme() {
  const themes = ['aurora', 'midnight', 'sunset', 'ocean', 'forest', 'carbon'];
  const current = state.settings.theme || 'aurora';
  const index = themes.indexOf(current);
  const next = themes[(index + 1) % themes.length];
  state.settings.theme = next;
  persistSettings();
  applySettings();
  renderProjects();
  showToast(`Theme set to ${next}`);
}

function openAeroModal() {
  const modal = document.getElementById('aero-modal');
  if (!modal) return;
  modal.classList.add('open');
  updateAeroContext();
  const output = document.getElementById('aero-output');
  if (output) {
    output.textContent = 'Your summary will appear here.';
  }
  setAeroStatus('Status: Checking Aero...');
  checkAeroSafety();
}

function closeAeroModal() {
  document.getElementById('aero-modal')?.classList.remove('open');
}

function updateAeroContext() {
  const nameEl = document.getElementById('aero-context-name');
  const metaEl = document.getElementById('aero-context-meta');
  const typeEl = document.getElementById('aero-context-type');
  const runButton = document.getElementById('aero-run-btn');
  const actionPicker = document.getElementById('aero-action-picker');
  const actionHeader = document.getElementById('aero-action-header');
  const actionTitle = document.getElementById('aero-action-title');
  const actionSubtitle = document.getElementById('aero-action-subtitle');
  if (!nameEl || !metaEl || !typeEl) return;

  if (!state.currentProject) {
    nameEl.textContent = 'No project selected';
    metaEl.textContent = 'Open a project to send content to Aero.';
    typeEl.textContent = 'Idle';
    if (runButton) runButton.disabled = true;
    if (actionPicker) actionPicker.style.display = '';
    if (actionHeader) actionHeader.style.display = 'none';
    return;
  }

  const typeLabel = {
    document: 'Document',
    notes: 'Notes',
    presentation: 'Presentation',
    spreadsheet: 'Spreadsheet'
  }[state.currentProject.type] || 'Project';

  const preview = (getCurrentProjectText() || '').split('\n').map(line => line.trim()).filter(Boolean)[0] || '';
  const shortPreview = preview.length > 80 ? `${preview.slice(0, 80)}…` : preview;

  if (state.currentProject.type === 'document') {
    nameEl.textContent = 'Entire document';
    metaEl.textContent = shortPreview ? `Preview: ${shortPreview}` : 'Aero will summarize all visible content.';
    if (actionTitle) actionTitle.textContent = 'Summarize document';
    if (actionSubtitle) actionSubtitle.textContent = 'Aero will summarize all visible content.';
    if (actionPicker) actionPicker.style.display = 'none';
    if (actionHeader) actionHeader.style.display = '';
  } else {
    nameEl.textContent = state.currentProject.name || 'Untitled Project';
    metaEl.textContent = shortPreview ? `Preview: ${shortPreview}` : `Ready to send ${typeLabel.toLowerCase()} content to Aero.`;
    if (actionPicker) actionPicker.style.display = '';
    if (actionHeader) actionHeader.style.display = 'none';
  }

  typeEl.textContent = typeLabel;
  if (runButton) runButton.disabled = false;
  updateAeroRunButtonLabel();
}

function setAeroStatus(message) {
  state.aero.statusMessage = message;
  const status = document.getElementById('aero-status');
  if (status) status.textContent = message;
  const insight = document.getElementById('insight-aero-status');
  if (insight) insight.textContent = message;
}

function getAeroEffectiveAction() {
  if (!state.currentProject) return 'summarize';
  if (state.currentProject.type === 'document') return 'summarize';
  return document.getElementById('aero-action')?.value || 'summarize';
}

function updateAeroRunButtonLabel() {
  const runButton = document.getElementById('aero-run-btn');
  if (!runButton) return;
  const action = getAeroEffectiveAction();
  const label = {
    summarize: 'Summarize',
    rewrite: 'Rewrite',
    explain: 'Explain',
    questions: 'Study Questions'
  }[action] || 'Run';
  runButton.innerHTML = `<i class="fas fa-wand-magic-sparkles"></i> ${label}`;
}

async function checkAeroSafety() {
  try {
    const response = await fetch(`${AERO_BASE_URL}/api/note26/version`, {
      method: 'GET',
      credentials: 'omit'
    });

    if (!response.ok) {
      throw new Error(`Aero check failed (${response.status})`);
    }

    await response.json();
    state.aero.banned = false;
    setAeroStatus('Status: Aero ready');
    return true;
  } catch (error) {
    console.warn('Aero availability check failed:', error);
    state.aero.banned = true;
    setAeroStatus('Status: Aero unavailable');
    return null;
  }
}

function getNote26EndpointForAction(action) {
  switch (action) {
    case 'summarize':
      return '/api/note26/summarize';
    case 'rewrite':
      return '/api/note26/rewrite';
    case 'explain':
      return '/api/note26/explain';
    case 'questions':
      return '/api/note26/questions';
    default:
      return '/api/note26/ai';
  }
}

async function callNote26Aero(action, input, options = {}) {
  const endpoint = getNote26EndpointForAction(action);
  const response = await fetch(`${AERO_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit',
    body: JSON.stringify({ input, options })
  });

  if (!response.ok) {
    throw new Error(`Aero request failed (${response.status})`);
  }

  return response.json();
}

async function runAeroAction() {
  const runButton = document.getElementById('aero-run-btn');
  const output = document.getElementById('aero-output');
  const action = getAeroEffectiveAction();
  const focus = document.getElementById('aero-focus')?.value.trim();
  const input = getCurrentProjectText();

  if (!input) {
    showToast('Add content to a project before using Aero', 'error');
    return;
  }

  if (state.aero.banned) {
    showToast('Aero access is disabled by safety policy', 'error');
    return;
  }

  if (runButton) {
    runButton.disabled = true;
    runButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Working...';
  }

  if (output) {
    output.textContent = action === 'summarize'
      ? 'Aero is summarizing your content…'
      : 'Aero is working…';
  }

  try {
    await checkAeroSafety();
    if (state.aero.banned) {
      throw new Error('Aero access disabled');
    }

    const options = {
      length: action === 'summarize' ? 'short' : 'medium'
    };
    if (focus) options.focus = focus;

    const data = await callNote26Aero(action, input, options);
    if (output) {
      const rawOutput = data?.output || 'Aero returned an empty response.';
      // Use marked to render markdown if available, otherwise plain text
      if (typeof marked !== 'undefined') {
        output.innerHTML = marked.parse(rawOutput);
      } else {
        output.textContent = rawOutput;
      }
      output.scrollTop = output.scrollHeight;
    }
    showToast('Aero response ready');
  } catch (error) {
    console.error(error);
    if (output) {
      output.textContent = error.message || 'Aero request failed.';
    }
    showToast('Aero request failed', 'error');
  } finally {
    if (runButton) {
      runButton.disabled = false;
      updateAeroRunButtonLabel();
    }
  }
}

function getCurrentProjectText() {
  if (!state.currentProject) return '';

  if (state.currentProject.type === 'document') {
    return document.getElementById('doc-editor')?.innerText.trim() || '';
  }

  if (state.currentProject.type === 'notes') {
    const notes = state.currentProject.data.notes || [];
    return notes.map(note => `${note.title || 'Untitled'}: ${note.content || ''}`).join('\n').trim();
  }

  if (state.currentProject.type === 'presentation') {
    const slides = state.currentProject.data.slides || [];
    return slides.map(slide => {
      const elements = (slide.elements || []).map(el => stripHtml(el.content || '')).join(' ');
      return `${slide.title || 'Slide'}: ${elements}`;
    }).join('\n').trim();
  }

  if (state.currentProject.type === 'spreadsheet') {
    const rows = state.currentProject.data.sheet || [];
    return rows.map(row => row.join(' | ')).join('\n').trim();
  }

  return '';
}

function stripHtml(html) {
  if (!html) return '';
  const parser = document.createElement('div');
  parser.innerHTML = html;
  return parser.textContent || '';
}

function createProject() {
  const name = document.getElementById('new-project-name').value.trim();
  const type = document.getElementById('new-project-type').value || state.settings.defaultProjectType || 'document';
  const templateId = document.getElementById('new-project-template').value;

  if (!name) {
    showToast('Please enter a project name', 'error');
    return;
  }

  const project = {
    id: Date.now().toString(),
    name,
    type,
    created: Date.now(),
    lastModified: Date.now(),
    data: initProjectData(type, templateId)
  };

  state.projects.push(project);
  saveProjects();
  closeNewProjectModal();
  openProject(project.id);
  showToast(templateId ? 'Project created from template' : 'Project created successfully');
}

function createQuickProject(type) {
  const projectType = type || state.settings.defaultProjectType || 'document';
  const names = {
    presentation: 'New Presentation',
    document: 'Untitled Document',
    spreadsheet: 'New Spreadsheet',
    notes: 'Quick Notes'
  };

  const project = {
    id: Date.now().toString(),
    name: names[projectType] || 'Untitled Project',
    type: projectType,
    created: Date.now(),
    lastModified: Date.now(),
    data: initProjectData(projectType)
  };

  state.projects.push(project);
  saveProjects();
  openProject(project.id);
}

function resumeLastProject() {
  if (!state.projects.length) {
    showToast('No projects to resume', 'error');
    return;
  }
  const recent = [...state.projects].sort((a, b) => b.lastModified - a.lastModified)[0];
  openProject(recent.id);
}

function initProjectData(type, templateId = '') {
  // If a template is specified, use it
  if (templateId && TEMPLATES[type]) {
    const template = TEMPLATES[type].find(t => t.id === templateId);
    if (template) {
      switch (type) {
        case 'document':
          return { content: template.content };
        case 'presentation':
          return { slides: template.slides.map(slide => ({
            ...slide,
            elements: [...slide.elements]
          })) };
        case 'spreadsheet':
          return { sheet: template.data.rows.map(row => [...row]) };
        case 'notes':
          return { notes: template.notes.map((note, index) => ({
            ...note,
            id: Date.now() + index
          })) };
      }
    }
  }

  // Default initialization (blank project)
  switch (type) {
    case 'presentation':
      return { slides: [createSlideTemplate('Title Slide')] };
    case 'document':
      return { content: '' };
    case 'spreadsheet':
      return { sheet: Array(15).fill(null).map(() => Array(8).fill('')) };
    case 'notes':
      return { notes: [] };
    default:
      return {};
  }
}

function createSlideTemplate(title = 'New Slide') {
  return {
    title,
    elements: [
      {
        id: generateElementId(),
        type: 'text',
        content: '<h2>Slide title</h2><p>Add your talking points...</p>',
        x: 10,
        y: 15,
        width: 60,
        height: 30
      }
    ],
    notes: '',
    background: '#ffffff',
    theme: 'clean'
  };
}

function openProject(id) {
  const project = state.projects.find(p => p.id === id);
  if (!project) return;

  state.currentProject = project;
  state.ui.activeSlideIndex = 0;
  setView('workspace');

  document.getElementById('project-name').value = project.name;
  document.getElementById('sidebar-project-name').textContent = project.name;

  renderWorkspace(project);
  const mode = state.settings.autosaveEnabled ? 'idle' : 'paused';
  const message = state.settings.autosaveEnabled ? 'All changes saved' : 'Autosave paused';
  setSaveStatus(message, mode);
}

function goHome() {
  if (state.currentProject) {
    saveCurrentProject();
  }
  state.currentProject = null;
  state.ui.activeSlideIndex = 0;
  setView('home');
  renderProjects();
}

function openSettingsPage() {
  setView('settings');
}

function renderSettingsPage() {
  populateSettingsForm();
  bindThemeCards();
  bindSettingsInteractions();
}

function saveCurrentProject() {
  if (!state.currentProject) return;

  setSaveStatus('Saving...', 'saving');
  state.currentProject.lastModified = Date.now();

  const nameInput = document.getElementById('project-name');
  if (nameInput) {
    state.currentProject.name = nameInput.value;
    document.getElementById('sidebar-project-name').textContent = nameInput.value;
  }

  if (state.currentProject.type === 'document') {
    state.currentProject.data.content = document.getElementById('doc-editor')?.innerHTML || '';
  }

  saveProjects();

  setTimeout(() => {
    const mode = state.settings.autosaveEnabled ? 'idle' : 'paused';
    const message = state.settings.autosaveEnabled ? 'All changes saved' : 'Autosave paused';
    setSaveStatus(message, mode);
  }, 200);
}

function saveProject() {
  saveCurrentProject();
  showToast('Project saved successfully');
}

function exportProject() {
  if (!state.currentProject) return;

  const data = JSON.stringify(state.currentProject, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.currentProject.name.replace(/\s+/g, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Project exported successfully');
}

function exportAllProjects() {
  if (!state.projects.length) {
    showToast('No projects to export', 'error');
    return;
  }
  const data = JSON.stringify(state.projects, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `note26-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup exported');
}

function triggerImportProject() {
  const input = document.getElementById('import-project-input');
  if (!input) {
    showToast('Import unavailable right now', 'error');
    return;
  }
  input.value = '';
  input.click();
}

function importNote25Documents() {
  try {
    const note25Data = localStorage.getItem('notes');
    if (!note25Data) {
      showToast('No Note25 documents found in browser storage', 'error');
      return;
    }

    const notes = JSON.parse(note25Data);
    if (!Array.isArray(notes) || notes.length === 0) {
      showToast('No Note25 documents to import', 'error');
      return;
    }

    let importedCount = 0;
    notes.forEach(note => {
      if (note && note.title && note.content) {
        const project = {
          id: Date.now().toString() + Math.random().toString(16).slice(2),
          name: note.title || 'Untitled Note25 Document',
          type: 'document',
          created: Date.now(),
          lastModified: Date.now(),
          data: {
            content: note.content
          }
        };
        state.projects.push(project);
        importedCount++;
      }
    });

    if (importedCount > 0) {
      saveProjects();
      showToast(`Successfully imported ${importedCount} Note25 document${importedCount > 1 ? 's' : ''}`);
    } else {
      showToast('No valid Note25 documents found', 'error');
    }
  } catch (error) {
    console.error('Note25 import error:', error);
    showToast('Failed to import Note25 documents', 'error');
  }
}

function handleImportProject(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (Array.isArray(parsed)) {
        parsed.forEach(importProjectObject);
      } else {
        importProjectObject(parsed);
      }
      saveProjects();
      showToast('Import complete');
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Import failed', 'error');
    }
  };
  reader.onerror = () => showToast('Import failed', 'error');
  reader.readAsText(file);
  event.target.value = '';
}

function importProjectObject(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid project file');
  }
  if (!raw.type) {
    throw new Error('Project type missing');
  }

  const project = {
    id: Date.now().toString() + Math.random().toString(16).slice(2),
    name: raw.name ? `${raw.name} (Imported)` : 'Imported Project',
    type: raw.type,
    created: Date.now(),
    lastModified: Date.now(),
    data: raw.data || initProjectData(raw.type)
  };

  state.projects.push(project);
}

function deleteProject(id) {
  if (!confirm('Delete this project? This cannot be undone.')) return;

  state.projects = state.projects.filter(p => p.id !== id);
  saveProjects();
  showToast('Project deleted');
  if (state.currentProject?.id === id) {
    goHome();
  }
}

function duplicateProject(id) {
  const project = state.projects.find(p => p.id === id);
  if (!project) return;

  const duplicate = {
    ...JSON.parse(JSON.stringify(project)),
    id: Date.now().toString(),
    name: `${project.name} (Copy)`,
    created: Date.now(),
    lastModified: Date.now()
  };

  state.projects.push(duplicate);
  saveProjects();
  showToast('Project duplicated');
}

function renderWorkspace(project) {
  const content = document.getElementById('workspace-content');
  if (!content) return;

  switch (project.type) {
    case 'presentation':
      renderPresentationWorkspace(content, project);
      break;
    case 'document':
      renderDocumentWorkspace(content, project);
      break;
    case 'spreadsheet':
      renderSpreadsheetWorkspace(content, project);
      break;
    case 'notes':
      renderNotesWorkspace(content, project);
      break;
    default:
      content.innerHTML = '<p>Unsupported project type.</p>';
  }
}

function normalizeSlide(slide) {
  const normalized = {
    title: slide.title || 'Slide',
    notes: slide.notes || '',
    background: slide.background || '#ffffff',
    theme: slide.theme || 'clean',
    elements: Array.isArray(slide.elements)
      ? slide.elements.map(normalizeSlideElement).filter(Boolean)
      : []
  };

  if (!normalized.elements.length) {
    normalized.elements.push({
      id: generateElementId(),
      type: 'text',
      content: slide.content || '<p>Start typing...</p>',
      x: 15,
      y: 15,
      width: 60,
      height: 30
    });
  }

  return normalized;
}

function normalizeSlideElement(element) {
  if (!element) return null;
  return {
    id: element.id || generateElementId(),
    type: element.type || 'text',
    content: element.content || '',
    x: typeof element.x === 'number' ? element.x : 10,
    y: typeof element.y === 'number' ? element.y : 10,
    width: typeof element.width === 'number' ? element.width : 30,
    height: typeof element.height === 'number' ? element.height : 20
  };
}

function renderPresentationWorkspace(container, project) {
  if (!Array.isArray(project.data.slides)) {
    project.data.slides = [createSlideTemplate('Title Slide')];
  }
  project.data.slides = project.data.slides.map(normalizeSlide);
  if (!project.data.slides.length) {
    project.data.slides.push(createSlideTemplate('Slide'));
  }

  state.ui.activeSlideIndex = Math.min(state.ui.activeSlideIndex, project.data.slides.length - 1);
  const slide = project.data.slides[state.ui.activeSlideIndex];
  if (!slide.elements.some(el => el.id === state.ui.activeElementId)) {
    state.ui.activeElementId = slide.elements[0]?.id || null;
  }

  container.innerHTML = `
    <div class="presentation-workspace">
      <div class="slides-shell">
      <aside class="slides-nav">
        <div class="slides-nav-header">
          <strong>Slides</strong>
          <button class="btn btn-icon btn-secondary" onclick="addSlideAfter(${state.ui.activeSlideIndex})" title="New slide">
            <i class="fas fa-plus"></i>
          </button>
        </div>
        <div class="slides-nav-list">
          ${project.data.slides.map((s, index) => `
            <div class="slide-thumb ${index === state.ui.activeSlideIndex ? 'active' : ''}" onclick="selectSlide(${index})">
              <span class="slide-thumb-number">${index + 1}</span>
              <div class="slide-thumb-preview" style="background:${s.background}">
                ${s.title}
              </div>
            </div>
          `).join('')}
        </div>
      </aside>
      <div class="slide-stage">
        <div class="slides-toolbar">
          <input type="text" class="form-input" value="${slide.title}" placeholder="Slide title" oninput="handleSlideTitleInput(this.value)">
          <input type="color" value="${slide.background}" onchange="setSlideBackground(this.value)">
          <select class="form-input" onchange="applySlideTheme(this.value)">
            <option value="clean" ${slide.theme === 'clean' ? 'selected' : ''}>Clean</option>
            <option value="gradient" ${slide.theme === 'gradient' ? 'selected' : ''}>Gradient</option>
            <option value="focus" ${slide.theme === 'focus' ? 'selected' : ''}>Focus</option>
          </select>
          <button class="btn btn-secondary" onclick="addTextBox()">
            <i class="fas fa-font"></i>
            Text Box
          </button>
          <button class="btn btn-secondary" id="slide-fullscreen-btn" onclick="toggleSlideFullscreen()">
            <i class="fas ${state.ui.isFullscreen ? 'fa-compress' : 'fa-expand'}"></i>
            ${state.ui.isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
          <button class="btn btn-secondary" onclick="duplicateSlide(${state.ui.activeSlideIndex})">Duplicate</button>
          <button class="btn btn-secondary" onclick="deleteSlide(${state.ui.activeSlideIndex})">Delete</button>
        </div>
        <div class="slide-stage-main" id="slide-stage-main">
          <div class="slide-canvas" id="slide-canvas" style="background:${slide.background}">
            ${renderSlideElements(slide)}
          </div>
          <div class="slide-notes">
            <label class="form-label">Speaker Notes</label>
            <textarea placeholder="Add presenter notes" oninput="handleSlideNotesInput(this.value)">${slide.notes}</textarea>
          </div>
        </div>
      </div>
    </div>
  `;

  applySlideTheme(slide.theme, true);
  highlightActiveElement();
}

function renderSlideElements(slide) {
  return slide.elements.map(element => `
    <div class="slide-element ${element.id === state.ui.activeElementId ? 'active' : ''}" data-element-id="${element.id}" style="left:${element.x}%; top:${element.y}%; width:${element.width}%; height:${element.height}%;">
      <div class="slide-element-toolbar">
        <button title="Move" onmousedown="startElementDrag(event, '${element.id}')">
          <i class="fas fa-arrows-alt"></i>
        </button>
        <button title="Delete" onclick="deleteElement('${element.id}')">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="slide-element-content" contenteditable="true" onclick="focusElement('${element.id}')" oninput="handleElementContentInput('${element.id}', this.innerHTML)">${element.content || ''}</div>
      <span class="slide-element-resize" onmousedown="startElementResize(event, '${element.id}')"></span>
    </div>
  `).join('');
}

function selectSlide(index) {
  state.ui.activeSlideIndex = index;
  renderWorkspace(state.currentProject);
}

function addSlideAfter(index) {
  if (!state.currentProject) return;
  const slides = state.currentProject.data.slides;
  slides.splice(index + 1, 0, createSlideTemplate(`Slide ${slides.length + 1}`));
  state.ui.activeSlideIndex = index + 1;
  renderWorkspace(state.currentProject);
  saveCurrentProject();
}

function duplicateSlide(index) {
  if (!state.currentProject) return;
  const slides = state.currentProject.data.slides;
  const clone = JSON.parse(JSON.stringify(slides[index]));
  if (Array.isArray(clone.elements)) {
    clone.elements = clone.elements.map(el => ({ ...el, id: generateElementId() }));
  }
  slides.splice(index + 1, 0, clone);
  state.ui.activeSlideIndex = index + 1;
  renderWorkspace(state.currentProject);
  saveCurrentProject();
}

function deleteSlide(index) {
  if (!state.currentProject) return;
  const slides = state.currentProject.data.slides;
  if (slides.length === 1) {
    showToast('Keep at least one slide', 'error');
    return;
  }
  slides.splice(index, 1);
  state.ui.activeSlideIndex = Math.max(0, index - 1);
  renderWorkspace(state.currentProject);
  saveCurrentProject();
}

function handleSlideTitleInput(value) {
  const slide = getActiveSlide();
  if (!slide) return;
  slide.title = value;
  saveCurrentProject();
}

function handleSlideNotesInput(value) {
  const slide = getActiveSlide();
  if (!slide) return;
  slide.notes = value;
  saveCurrentProject();
}

function setSlideBackground(color) {
  const slide = getActiveSlide();
  if (!slide) return;
  slide.background = color;
  const canvas = document.getElementById('slide-canvas');
  if (canvas) {
    canvas.style.background = color;
  }
  applySlideTheme(slide.theme, true);
  saveCurrentProject();
}

function applySlideTheme(theme, silent = false) {
  const slide = getActiveSlide();
  if (!slide) return;
  if (!silent) {
    slide.theme = theme;
  }
  const canvas = document.getElementById('slide-canvas');
  if (!canvas) return;

  if (theme === 'gradient') {
    canvas.style.background = 'linear-gradient(135deg, var(--primary), var(--accent-secondary))';
    canvas.style.color = '#ffffff';
  } else if (theme === 'focus') {
    canvas.style.background = slide.background || '#11172a';
    canvas.style.color = '#ffffff';
  } else {
    canvas.style.background = slide.background || 'var(--slide-bg)';
    canvas.style.color = 'inherit';
  }

  if (!silent) {
    saveCurrentProject();
  }
}

function addTextBox() {
  const slide = getActiveSlide();
  if (!slide) return;
  const element = {
    id: generateElementId(),
    type: 'text',
    content: '<p>Double click to edit</p>',
    x: 20,
    y: 20,
    width: 40,
    height: 20
  };
  slide.elements.push(element);
  state.ui.activeElementId = element.id;
  renderWorkspace(state.currentProject);
  saveCurrentProject();
}

function focusElement(id) {
  state.ui.activeElementId = id;
  highlightActiveElement();
}

function handleElementContentInput(id, html) {
  const slide = getActiveSlide();
  if (!slide) return;
  const element = slide.elements.find(el => el.id === id);
  if (!element) return;
  element.content = html;
  saveCurrentProject();
}

function deleteElement(id) {
  const slide = getActiveSlide();
  if (!slide) return;
  slide.elements = slide.elements.filter(el => el.id !== id);
  if (state.ui.activeElementId === id) {
    state.ui.activeElementId = slide.elements[0]?.id || null;
  }
  renderWorkspace(state.currentProject);
  saveCurrentProject();
}

function startElementDrag(event, id) {
  event.preventDefault();
  event.stopPropagation();
  const slide = getActiveSlide();
  if (!slide) return;
  const element = slide.elements.find(el => el.id === id);
  if (!element) return;
  const canvas = document.getElementById('slide-canvas');
  if (!canvas) return;
  state.ui.draggingElement = {
    id,
    startX: event.clientX,
    startY: event.clientY,
    originX: element.x,
    originY: element.y,
    canvasRect: canvas.getBoundingClientRect()
  };
  focusElement(id);
}

function startElementResize(event, id) {
  event.preventDefault();
  event.stopPropagation();
  const slide = getActiveSlide();
  if (!slide) return;
  const element = slide.elements.find(el => el.id === id);
  if (!element) return;
  const canvas = document.getElementById('slide-canvas');
  if (!canvas) return;
  state.ui.resizingElement = {
    id,
    startX: event.clientX,
    startY: event.clientY,
    originWidth: element.width,
    originHeight: element.height,
    originX: element.x,
    originY: element.y,
    canvasRect: canvas.getBoundingClientRect()
  };
  focusElement(id);
}

function handlePointerMove(event) {
  if (state.ui.draggingElement) {
    const { id, startX, startY, originX, originY, canvasRect } = state.ui.draggingElement;
    const slide = getActiveSlide();
    if (!slide) return;
    const element = slide.elements.find(el => el.id === id);
    if (!element) return;
    const deltaX = ((event.clientX - startX) / canvasRect.width) * 100;
    const deltaY = ((event.clientY - startY) / canvasRect.height) * 100;
    element.x = clamp(originX + deltaX, 0, 100 - element.width);
    element.y = clamp(originY + deltaY, 0, 100 - element.height);
    updateElementStyles(id, element);
  } else if (state.ui.resizingElement) {
    const { id, startX, startY, originWidth, originHeight, originX, originY, canvasRect } = state.ui.resizingElement;
    const slide = getActiveSlide();
    if (!slide) return;
    const element = slide.elements.find(el => el.id === id);
    if (!element) return;
    const deltaX = ((event.clientX - startX) / canvasRect.width) * 100;
    const deltaY = ((event.clientY - startY) / canvasRect.height) * 100;
    const newWidth = clamp(originWidth + deltaX, 10, 100 - originX);
    const newHeight = clamp(originHeight + deltaY, 10, 100 - originY);
    element.width = newWidth;
    element.height = newHeight;
    updateElementStyles(id, element);
  }
}

function stopElementInteraction() {
  if (state.ui.draggingElement || state.ui.resizingElement) {
    state.ui.draggingElement = null;
    state.ui.resizingElement = null;
    saveCurrentProject();
  }
}

function updateElementStyles(id, element) {
  const node = document.querySelector(`.slide-element[data-element-id="${id}"]`);
  if (node) {
    node.style.left = `${element.x}%`;
    node.style.top = `${element.y}%`;
    node.style.width = `${element.width}%`;
    node.style.height = `${element.height}%`;
  }
}

function highlightActiveElement() {
  const elements = document.querySelectorAll('.slide-element');
  elements.forEach(el => {
    el.classList.toggle('active', el.dataset.elementId === state.ui.activeElementId);
  });
}

function toggleSlideFullscreen() {
  const stage = document.getElementById('slide-stage-main');
  if (!stage) return;
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
  } else {
    (stage.requestFullscreen || stage.webkitRequestFullscreen)?.call(stage);
  }
}

function updateFullscreenButton() {
  const btn = document.getElementById('slide-fullscreen-btn');
  if (!btn) return;
  if (state.ui.isFullscreen) {
    btn.innerHTML = '<i class="fas fa-compress"></i> Exit Fullscreen';
  } else {
    btn.innerHTML = '<i class="fas fa-expand"></i> Fullscreen';
  }
}
function getActiveSlide() {
  if (!state.currentProject || state.currentProject.type !== 'presentation') return null;
  return state.currentProject.data.slides?.[state.ui.activeSlideIndex];
}

function renderDocumentWorkspace(container, project) {
  container.innerHTML = `
    <div class="doc-shell doc-shell-full">
      <div class="doc-main doc-main-full">
        <div class="doc-topbar">
          ${buildDocToolbar()}
          <div class="doc-menu-bar">
            <div class="doc-menu-wrap">
              <button class="doc-menu-item" onclick="toggleDocMenu('file')">File</button>
              <div class="doc-menu-dropdown" data-menu="file">
                <button onclick="saveProject()"><i class="fas fa-save"></i> Save</button>
                <button onclick="exportProject()"><i class="fas fa-download"></i> Export</button>
                <button onclick="exportAllProjects()"><i class="fas fa-box-archive"></i> Export All</button>
              </div>
            </div>
            <div class="doc-menu-wrap">
              <button class="doc-menu-item" onclick="toggleDocMenu('format')">Format</button>
              <div class="doc-menu-dropdown" data-menu="format">
                <button onclick="formatDoc('bold')"><i class="fas fa-bold"></i> Bold</button>
                <button onclick="formatDoc('italic')"><i class="fas fa-italic"></i> Italic</button>
                <button onclick="formatDoc('underline')"><i class="fas fa-underline"></i> Underline</button>
                <button onclick="formatDoc('strikeThrough')"><i class="fas fa-strikethrough"></i> Strike</button>
                <div class="doc-menu-divider"></div>
                <button onclick="formatDoc('formatBlock', '<h1>')"><i class="fas fa-heading"></i> Heading 1</button>
                <button onclick="formatDoc('formatBlock', '<h2>')"><i class="fas fa-heading"></i> Heading 2</button>
                <button onclick="formatDoc('formatBlock', '<h3>')"><i class="fas fa-heading"></i> Heading 3</button>
                <div class="doc-menu-divider"></div>
                <button onclick="formatDoc('justifyLeft')"><i class="fas fa-align-left"></i> Align Left</button>
                <button onclick="formatDoc('justifyCenter')"><i class="fas fa-align-center"></i> Align Center</button>
                <button onclick="formatDoc('justifyRight')"><i class="fas fa-align-right"></i> Align Right</button>
                <button onclick="formatDoc('justifyFull')"><i class="fas fa-align-justify"></i> Justify</button>
              </div>
            </div>
            <div class="doc-menu-wrap">
              <button class="doc-menu-item" onclick="toggleDocMenu('edit')">Edit</button>
              <div class="doc-menu-dropdown" data-menu="edit">
                <button onclick="document.execCommand('undo')"><i class="fas fa-rotate-left"></i> Undo</button>
                <button onclick="document.execCommand('redo')"><i class="fas fa-rotate-right"></i> Redo</button>
                <div class="doc-menu-divider"></div>
                <button onclick="document.execCommand('cut')"><i class="fas fa-scissors"></i> Cut</button>
                <button onclick="document.execCommand('copy')"><i class="fas fa-copy"></i> Copy</button>
                <button onclick="document.execCommand('paste')"><i class="fas fa-paste"></i> Paste</button>
                <div class="doc-menu-divider"></div>
                <button onclick="formatDoc('removeFormat')"><i class="fas fa-eraser"></i> Clear Formatting</button>
              </div>
            </div>
            <div class="doc-menu-wrap">
              <button class="doc-menu-item" onclick="toggleDocMenu('insert')">Insert</button>
	              <div class="doc-menu-dropdown" data-menu="insert">
	                <button onclick="insertDocCallout()"><i class="fas fa-circle-info"></i> Callout</button>
	                <button onclick="insertDocQuote()"><i class="fas fa-quote-left"></i> Quote</button>
	                <button onclick="insertDocChecklist()"><i class="fas fa-list-check"></i> Checklist</button>
	                <button onclick="insertDocCodeBlock()"><i class="fas fa-code"></i> Code Block</button>
	                <button onclick="insertDocDivider()"><i class="fas fa-minus"></i> Divider</button>
	                <button onclick="insertDocTimestamp()"><i class="fas fa-clock"></i> Timestamp</button>
	                <div class="doc-menu-divider"></div>
	                <button onclick="insertDocImage()"><i class="fas fa-image"></i> Image</button>
	                <button onclick="insertDocVector()"><i class="fas fa-draw-polygon"></i> Vector (SVG)</button>
	                <button onclick="insertDocShape()"><i class="fas fa-shapes"></i> Shape</button>
	                <div class="doc-menu-divider"></div>
	                <button onclick="insertDocLink()"><i class="fas fa-link"></i> Link</button>
	              </div>
            </div>
            <div class="doc-menu-wrap">
              <button class="doc-menu-item" onclick="toggleDocMenu('tools')">Tools</button>
              <div class="doc-menu-dropdown" data-menu="tools">
                <button onclick="openAeroModal()"><i class="fas fa-wand-magic-sparkles"></i> Aero</button>
                <button onclick="saveProject()"><i class="fas fa-save"></i> Save Project</button>
              </div>
            </div>
            <div class="doc-menu-wrap">
              <button class="doc-menu-item" onclick="toggleDocMenu('view')">View</button>
              <div class="doc-menu-dropdown" data-menu="view">
                <button onclick="toggleOutlinePanel()"><i class="fas fa-list"></i> Outline</button>
              </div>
            </div>
            <div class="doc-menu-wrap">
              <button class="doc-menu-item" onclick="toggleDocMenu('help')">Help</button>
              <div class="doc-menu-dropdown" data-menu="help">
                <button onclick="openSettingsPage()"><i class="fas fa-gear"></i> Settings</button>
                <button onclick="showToast('Need help? Check the README.', 'success')"><i class="fas fa-circle-info"></i> Help Center</button>
              </div>
            </div>
          </div>
        </div>
        <div class="doc-body">
          <div class="doc-content">
	            <div class="content-area doc-content-area">
	              <div class="doc-page editor-area" id="doc-editor" contenteditable="true" data-placeholder="Start writing your document..."></div>
	              <input id="doc-media-input" type="file" style="display:none" />
	            </div>
	          </div>
	        </div>
      </div>
    </div>
    <div class="doc-outline-panel" id="doc-outline-panel" aria-hidden="true">
      <div class="doc-outline-panel-header">
        <strong>Outline</strong>
        <button class="btn btn-ghost btn-icon" onclick="toggleOutlinePanel()" aria-label="Close outline">
          <i class="fas fa-xmark"></i>
        </button>
      </div>
      <div class="doc-outline-panel-body">
        <ul id="doc-outline-list"></ul>
      </div>
    </div>
	    <div class="doc-context-menu" id="doc-context-menu" role="menu" aria-hidden="true">
	      <button class="doc-context-item doc-image-item" onclick="viewDocContextImage()" style="display: none;"><i class="fas fa-up-right-from-square"></i> View image</button>
	      <button class="doc-context-item doc-image-item" onclick="editDocContextImageCaption()" style="display: none;"><i class="fas fa-closed-captioning"></i> Edit caption</button>
	      <div class="doc-context-divider doc-image-item" style="display: none;"></div>
	      <div class="doc-context-label doc-image-item" style="display: none;">Resize</div>
	      <button class="doc-context-item doc-image-item" onclick="setDocContextImageSize('small')" style="display: none;"><i class="fas fa-down-left-and-up-right-to-center"></i> Small</button>
	      <button class="doc-context-item doc-image-item" onclick="setDocContextImageSize('medium')" style="display: none;"><i class="fas fa-maximize"></i> Medium</button>
	      <button class="doc-context-item doc-image-item" onclick="setDocContextImageSize('large')" style="display: none;"><i class="fas fa-up-right-and-down-left-from-center"></i> Large</button>
	      <button class="doc-context-item doc-image-item" onclick="setDocContextImageSize('original')" style="display: none;"><i class="fas fa-expand"></i> Original</button>
	      <div class="doc-context-divider doc-image-item" style="display: none;"></div>
	      <div class="doc-context-label doc-image-item" style="display: none;">Align</div>
	      <button class="doc-context-item doc-image-item" onclick="setDocContextImageAlign('inline')" style="display: none;"><i class="fas fa-grip-lines-vertical"></i> Inline</button>
	      <button class="doc-context-item doc-image-item" onclick="setDocContextImageAlign('left')" style="display: none;"><i class="fas fa-align-left"></i> Left</button>
	      <button class="doc-context-item doc-image-item" onclick="setDocContextImageAlign('center')" style="display: none;"><i class="fas fa-align-center"></i> Center</button>
	      <button class="doc-context-item doc-image-item" onclick="setDocContextImageAlign('right')" style="display: none;"><i class="fas fa-align-right"></i> Right</button>
	      <div class="doc-context-divider doc-image-item" style="display: none;"></div>
	      <button class="doc-context-item doc-context-summarize" onclick="summarizeSelectedText()" style="display: none;"><i class="fas fa-wand-magic-sparkles"></i> Summarize with Aero</button>
	      <div class="doc-context-divider doc-context-summarize-divider" style="display: none;"></div>
	      <button class="doc-context-item" onclick="formatDoc('bold')"><i class="fas fa-bold"></i> Bold</button>
	      <button class="doc-context-item" onclick="formatDoc('italic')"><i class="fas fa-italic"></i> Italic</button>
      <button class="doc-context-item" onclick="formatDoc('underline')"><i class="fas fa-underline"></i> Underline</button>
      <button class="doc-context-item" onclick="formatDoc('strikeThrough')"><i class="fas fa-strikethrough"></i> Strike</button>
      <div class="doc-context-divider"></div>
      <button class="doc-context-item" onclick="formatDoc('formatBlock', '<h1>')"><i class="fas fa-heading"></i> Heading 1</button>
      <button class="doc-context-item" onclick="formatDoc('formatBlock', '<h2>')"><i class="fas fa-heading"></i> Heading 2</button>
      <button class="doc-context-item" onclick="formatDoc('insertUnorderedList')"><i class="fas fa-list-ul"></i> Bullet List</button>
      <button class="doc-context-item" onclick="formatDoc('insertOrderedList')"><i class="fas fa-list-ol"></i> Numbered List</button>
      <div class="doc-context-divider"></div>
      <button class="doc-context-item" onclick="formatDoc('justifyLeft')"><i class="fas fa-align-left"></i> Align Left</button>
      <button class="doc-context-item" onclick="formatDoc('justifyCenter')"><i class="fas fa-align-center"></i> Align Center</button>
      <button class="doc-context-item" onclick="formatDoc('justifyRight')"><i class="fas fa-align-right"></i> Align Right</button>
      <button class="doc-context-item" onclick="formatDoc('justifyFull')"><i class="fas fa-align-justify"></i> Justify</button>
      <div class="doc-context-divider"></div>
      <button class="doc-context-item" onclick="insertDocCallout()"><i class="fas fa-circle-info"></i> Callout</button>
      <button class="doc-context-item" onclick="insertDocQuote()"><i class="fas fa-quote-left"></i> Quote</button>
      <button class="doc-context-item" onclick="insertDocChecklist()"><i class="fas fa-list-check"></i> Checklist</button>
      <button class="doc-context-item" onclick="insertDocCodeBlock()"><i class="fas fa-code"></i> Code Block</button>
      <button class="doc-context-item" onclick="insertDocDivider()"><i class="fas fa-minus"></i> Divider</button>
      <button class="doc-context-item" onclick="insertDocTimestamp()"><i class="fas fa-clock"></i> Timestamp</button>
      <div class="doc-context-divider"></div>
      <button class="doc-context-item" onclick="insertDocLink()"><i class="fas fa-link"></i> Insert Link</button>
      <button class="doc-context-item" onclick="formatDoc('removeFormat')"><i class="fas fa-eraser"></i> Clear Formatting</button>
    </div>
    <div class="doc-summary-panel" id="doc-summary-panel" aria-hidden="true">
      <div class="doc-summary-header">
        <strong>Summary</strong>
        <button class="btn btn-ghost btn-icon" onclick="closeDocSummary()" aria-label="Close summary">
          <i class="fas fa-xmark"></i>
        </button>
      </div>
      <div class="doc-summary-body" id="doc-summary-body">Select text to summarize.</div>
      <div class="doc-summary-footer">
        <button class="btn btn-secondary btn-small" onclick="copyDocSummary()">
          <i class="fas fa-copy"></i>
          Copy
        </button>
      </div>
    </div>
  `;

  const editor = document.getElementById('doc-editor');
  const mediaInput = document.getElementById('doc-media-input');
  if (editor) {
    editor.innerHTML = project.data.content || '';
    editor.addEventListener('input', () => {
      updateWordCount();
      updateDocOutline();
      updateDocInsights();
      saveCurrentProject();
    });
    editor.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      openDocContextMenu(event);
    });
    editor.addEventListener('paste', handleDocPaste);
    editor.addEventListener('dragover', (event) => event.preventDefault());
    editor.addEventListener('drop', handleDocDrop);
  }
  if (mediaInput) {
    mediaInput.onchange = handleDocMediaSelected;
  }
  updateWordCount();
  updateDocOutline();
  updateDocInsights();
}

function buildDocToolbar() {
  return `
    <div class="workspace-toolbar">
      <div class="toolbar-group">
        <button class="toolbar-btn" onclick="formatDoc('bold')" title="Bold"><i class="fas fa-bold"></i></button>
        <button class="toolbar-btn" onclick="formatDoc('italic')" title="Italic"><i class="fas fa-italic"></i></button>
        <button class="toolbar-btn" onclick="formatDoc('underline')" title="Underline"><i class="fas fa-underline"></i></button>
        <button class="toolbar-btn" onclick="formatDoc('strikeThrough')" title="Strikethrough"><i class="fas fa-strikethrough"></i></button>
      </div>
      <div class="toolbar-group">
        <select class="toolbar-select" onchange="formatDoc('fontName', this.value)">
          <option value="Manrope">Manrope</option>
          <option value="Space Grotesk">Space Grotesk</option>
          <option value="Georgia">Georgia</option>
        </select>
        <select class="toolbar-select" onchange="formatDoc('formatBlock', this.value)">
          <option value="<p>">Paragraph</option>
          <option value="<h1>">Heading 1</option>
          <option value="<h2>">Heading 2</option>
          <option value="<h3>">Heading 3</option>
        </select>
      </div>
      <div class="toolbar-group">
        <button class="toolbar-btn" onclick="formatDoc('insertUnorderedList')" title="Bullet List"><i class="fas fa-list-ul"></i></button>
        <button class="toolbar-btn" onclick="formatDoc('insertOrderedList')" title="Numbered List"><i class="fas fa-list-ol"></i></button>
        <button class="toolbar-btn" onclick="formatDoc('justifyLeft')" title="Align Left"><i class="fas fa-align-left"></i></button>
        <button class="toolbar-btn" onclick="formatDoc('justifyCenter')" title="Align Center"><i class="fas fa-align-center"></i></button>
        <button class="toolbar-btn" onclick="formatDoc('justifyRight')" title="Align Right"><i class="fas fa-align-right"></i></button>
        <button class="toolbar-btn" onclick="formatDoc('justifyFull')" title="Justify"><i class="fas fa-align-justify"></i></button>
      </div>
      <div class="toolbar-group">
        <input type="color" class="color-input" onchange="formatDoc('foreColor', this.value)" value="#0f172a" title="Text Color">
        <input type="color" class="color-input" onchange="formatDoc('hiliteColor', this.value)" value="#ffff00" title="Highlight">
      </div>
      <div class="toolbar-group">
        <button class="toolbar-btn" onclick="formatDoc('indent')" title="Indent"><i class="fas fa-indent"></i></button>
        <button class="toolbar-btn" onclick="formatDoc('outdent')" title="Outdent"><i class="fas fa-outdent"></i></button>
        <button class="toolbar-btn" onclick="insertDocLink()" title="Insert Link"><i class="fas fa-link"></i></button>
        <button class="toolbar-btn" onclick="formatDoc('removeFormat')" title="Clear Formatting"><i class="fas fa-eraser"></i></button>
      </div>
      <div class="toolbar-group">
        <button class="toolbar-btn" onclick="insertDocImage()" title="Insert Image"><i class="fas fa-image"></i></button>
        <button class="toolbar-btn" onclick="insertDocVector()" title="Insert Vector (SVG)"><i class="fas fa-draw-polygon"></i></button>
        <button class="toolbar-btn" onclick="insertDocShape()" title="Insert Shape"><i class="fas fa-shapes"></i></button>
      </div>
      <div class="toolbar-group">
        <button class="btn btn-aero btn-small" onclick="openAeroModal()">
          <i class="fas fa-wand-magic-sparkles"></i>
          Aero
        </button>
      </div>
    </div>
  `;
}

function formatDoc(command, value = null) {
  document.execCommand(command, false, value);
  updateWordCount();
  updateDocOutline();
}

function updateWordCount() {
  const editor = document.getElementById('doc-editor');
  if (!editor) return;
  const text = editor.innerText.trim();
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  document.getElementById('word-count').textContent = `${words.length} words`;
  document.getElementById('char-count').textContent = `${text.length} characters`;
}

function updateDocOutline() {
  const outline = document.getElementById('doc-outline-list');
  const editor = document.getElementById('doc-editor');
  if (!outline || !editor) return;

  const parser = document.createElement('div');
  parser.innerHTML = editor.innerHTML;
  const headings = parser.querySelectorAll('h1, h2, h3');
  if (!headings.length) {
    outline.innerHTML = '<li>No headings yet</li>';
    return;
  }

  outline.innerHTML = Array.from(headings).map(h => {
    const level = h.tagName.toLowerCase();
    const indent = level === 'h1' ? 0 : level === 'h2' ? 12 : 24;
    return `<li style="padding-left:${indent}px">${h.textContent || 'Untitled section'}</li>`;
  }).join('');
}

function toggleDocMenu(name) {
  const menu = document.querySelector(`.doc-menu-dropdown[data-menu="${name}"]`);
  if (!menu) return;
  const isOpen = menu.classList.contains('open');
  closeDocMenus();
  if (!isOpen) {
    menu.classList.add('open');
  }
}

function closeDocMenus() {
  document.querySelectorAll('.doc-menu-dropdown.open').forEach(menu => {
    menu.classList.remove('open');
  });
}

// Make sure dropdowns close when clicking outside
document.addEventListener('click', (event) => {
  const isMenuButton = event.target.closest('.doc-menu-item');
  const isInsideDropdown = event.target.closest('.doc-menu-dropdown');

  if (!isMenuButton && !isInsideDropdown) {
    closeDocMenus();
  }
});

function toggleOutlinePanel() {
  const panel = document.getElementById('doc-outline-panel');
  if (!panel) return;
  const isOpen = panel.classList.contains('open');
  if (isOpen) {
    closeOutlinePanel();
  } else {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    updateDocOutline();
  }
}

function closeOutlinePanel() {
  const panel = document.getElementById('doc-outline-panel');
  if (!panel) return;
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
}

function updateDocInsights() {
  const editor = document.getElementById('doc-editor');
  if (!editor) return;
  const text = editor.innerText.trim();
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const paragraphs = editor.querySelectorAll('p').length;
  const headings = editor.querySelectorAll('h1, h2, h3').length;
  const minutes = wordCount ? Math.max(1, Math.ceil(wordCount / 200)) : 0;

  const wordEl = document.getElementById('doc-insight-words');
  const timeEl = document.getElementById('doc-insight-time');
  const headingEl = document.getElementById('doc-insight-headings');
  const paraEl = document.getElementById('doc-insight-paragraphs');

  if (wordEl) wordEl.textContent = wordCount.toString();
  if (timeEl) timeEl.textContent = `${minutes} min read`;
  if (headingEl) headingEl.textContent = `${headings} headings`;
  if (paraEl) paraEl.textContent = `${paragraphs} paragraphs`;
}

function insertDocHtml(html) {
  const editor = document.getElementById('doc-editor');
  if (!editor) return;
  editor.focus();
  document.execCommand('insertHTML', false, html);
  updateWordCount();
  updateDocOutline();
  updateDocInsights();
  saveCurrentProject();
}

function openDocMediaPicker(accept) {
  const input = document.getElementById('doc-media-input');
  if (!input) return;
  input.value = '';
  input.accept = accept;
  input.multiple = true;
  input.click();
}

function insertDocImage() {
  openDocMediaPicker('image/*');
}

function insertDocVector() {
  openDocMediaPicker('image/svg+xml');
}

function insertDocShape() {
  const type = prompt('Shape type: rect, circle, arrow', 'rect');
  if (!type) return;
  const svg = buildDocShapeSvg(type.trim().toLowerCase());
  if (!svg) {
    showToast('Unknown shape type', 'error');
    return;
  }
  insertDocHtml(`<span class="doc-media-wrap" contenteditable="false">${svg}</span><p></p>`);
}

function buildDocShapeSvg(type) {
  const base = 'class="doc-media doc-shape" width="320" height="160" viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg"';
  switch (type) {
    case 'rect':
    case 'rectangle':
      return `<svg ${base}><rect x="16" y="20" width="288" height="120" rx="18" fill="rgba(99,102,241,0.18)" stroke="rgba(99,102,241,0.65)" stroke-width="3"/></svg>`;
    case 'circle':
      return `<svg ${base}><circle cx="160" cy="80" r="58" fill="rgba(34,197,94,0.18)" stroke="rgba(34,197,94,0.65)" stroke-width="3"/></svg>`;
    case 'arrow':
      return `<svg ${base}><path d="M24 80h220" stroke="rgba(245,158,11,0.8)" stroke-width="10" stroke-linecap="round"/><path d="M220 48l72 32-72 32" fill="none" stroke="rgba(245,158,11,0.8)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    default:
      return null;
  }
}

async function handleDocMediaSelected(event) {
  const input = event?.target;
  const files = Array.from(input?.files || []);
  if (!files.length) return;

  for (const file of files) {
    const mime = file.type || '';
    if (!mime.startsWith('image/')) continue;

    const dataUrl = await readFileAsDataURL(file);
    if (!dataUrl) continue;

    const safeAlt = escapeHtml(file.name || 'media');
    const imgClass = mime === 'image/svg+xml' ? 'doc-media doc-vector' : 'doc-media doc-image';
    insertDocHtml(`<span class="doc-media-wrap align-center" contenteditable="false"><img class="${imgClass}" src="${dataUrl}" alt="${safeAlt}" loading="lazy"></span><p></p>`);
  }
}

async function handleDocPaste(event) {
  const items = Array.from(event.clipboardData?.items || []);
  const imageItem = items.find(item => (item.type || '').startsWith('image/'));
  if (!imageItem) return;
  event.preventDefault();
  const file = imageItem.getAsFile();
  if (!file) return;
  const dataUrl = await readFileAsDataURL(file);
  if (!dataUrl) return;
  insertDocHtml(`<span class="doc-media-wrap align-center" contenteditable="false"><img class="doc-media doc-image" src="${dataUrl}" alt="pasted image" loading="lazy"></span><p></p>`);
}

async function handleDocDrop(event) {
  event.preventDefault();
  const files = Array.from(event.dataTransfer?.files || []);
  if (!files.length) return;
  const supported = files.filter(file => (file.type || '').startsWith('image/'));
  if (!supported.length) {
    showToast('Drop an image or SVG file to insert', 'error');
    return;
  }

  for (const file of supported) {
    const dataUrl = await readFileAsDataURL(file);
    if (!dataUrl) continue;
    const safeAlt = escapeHtml(file.name || 'dropped media');
    const imgClass = file.type === 'image/svg+xml' ? 'doc-media doc-vector' : 'doc-media doc-image';
    insertDocHtml(`<span class="doc-media-wrap align-center" contenteditable="false"><img class="${imgClass}" src="${dataUrl}" alt="${safeAlt}" loading="lazy"></span><p></p>`);
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function viewDocContextImage() {
  if (!docContextMediaNode) return;
  const img = docContextMediaNode.querySelector('img');
  if (img?.src) {
    window.open(img.src, '_blank', 'noopener,noreferrer');
    closeDocContextMenu();
    return;
  }
  const svg = docContextMediaNode.querySelector('svg');
  if (svg) {
    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    closeDocContextMenu();
  }
}

function editDocContextImageCaption() {
  if (!docContextMediaNode) return;
  const existing = docContextMediaNode.dataset.caption || docContextMediaNode.querySelector('.doc-media-caption')?.textContent || '';
  const caption = prompt('Caption', existing);
  if (caption === null) return;
  setDocMediaCaption(docContextMediaNode, caption.trim());
  closeDocContextMenu();
}

function setDocMediaCaption(wrap, caption) {
  if (!wrap) return;
  wrap.dataset.caption = caption;
  const existing = wrap.querySelector('.doc-media-caption');
  if (!caption) {
    existing?.remove();
    saveCurrentProject();
    return;
  }
  if (existing) {
    existing.textContent = caption;
  } else {
    const node = document.createElement('div');
    node.className = 'doc-media-caption';
    node.textContent = caption;
    node.setAttribute('contenteditable', 'false');
    wrap.appendChild(node);
  }
  saveCurrentProject();
}

function setDocContextImageSize(size) {
  if (!docContextMediaNode) return;
  applyDocMediaSize(docContextMediaNode, size);
  saveCurrentProject();
  closeDocContextMenu();
}

function applyDocMediaSize(wrap, size) {
  const sizes = {
    small: 240,
    medium: 420,
    large: 720,
    original: null
  };
  const px = sizes[size] ?? sizes.medium;
  wrap.dataset.size = size;
  wrap.style.maxWidth = px ? `${px}px` : '';

  const img = wrap.querySelector('img');
  if (img) {
    img.style.width = '100%';
    img.style.height = 'auto';
  }
  const svg = wrap.querySelector('svg');
  if (svg) {
    svg.style.width = '100%';
    svg.style.height = 'auto';
    svg.removeAttribute('height');
  }
}

function setDocContextImageAlign(align) {
  if (!docContextMediaNode) return;
  applyDocMediaAlign(docContextMediaNode, align);
  saveCurrentProject();
  closeDocContextMenu();
}

function applyDocMediaAlign(wrap, align) {
  wrap.dataset.align = align;
  wrap.classList.remove('align-inline', 'align-left', 'align-center', 'align-right');
  const cls = `align-${align}`;
  wrap.classList.add(cls);
}

function insertDocCallout() {
  insertDocHtml('<div class="doc-callout"><strong>Note:</strong> Add your callout text here.</div><p></p>');
}

function insertDocQuote() {
  insertDocHtml('<blockquote class="doc-quote">Drop a quote or key takeaway here.</blockquote><p></p>');
}

function insertDocChecklist() {
  insertDocHtml('<ul class="doc-checklist"><li>First task</li><li>Second task</li></ul><p></p>');
}

function insertDocCodeBlock() {
  insertDocHtml('<pre class="doc-code"><code>// paste code here</code></pre><p></p>');
}

function insertDocDivider() {
  insertDocHtml('<hr class="doc-divider">');
}

function insertDocTimestamp() {
  const stamp = new Date().toLocaleString();
  insertDocHtml(`<p class="doc-timestamp">${stamp}</p>`);
}

function insertDocLink() {
  const url = prompt('Enter link URL');
  if (!url) return;
  document.execCommand('createLink', false, url);
}

let docContextMenuOpenedAt = 0;
let docContextMediaNode = null;

function openDocContextMenu(eventOrX, y) {
  const menu = document.getElementById('doc-context-menu');
  if (!menu) return;

  const isEvent = typeof eventOrX === 'object' && eventOrX;
  const x = isEvent ? eventOrX.clientX : eventOrX;
  const yPos = isEvent ? eventOrX.clientY : y;
  const target = isEvent ? eventOrX.target : null;

  docContextMenuOpenedAt = Date.now();
  docContextMediaNode = target?.closest?.('.doc-media-wrap') || null;

  setDocContextMenuMode(menu, docContextMediaNode ? 'image' : 'text');

  if (!docContextMediaNode) {
    const selectionText = getSelectedDocText();
    const summarizeButton = menu.querySelector('.doc-context-summarize');
    const summarizeDivider = menu.querySelector('.doc-context-summarize-divider');
    const showSummarize = selectionText.length > 0;

    if (summarizeButton) {
      summarizeButton.style.display = showSummarize ? 'flex' : 'none';
    }
    if (summarizeDivider) {
      summarizeDivider.style.display = showSummarize ? 'block' : 'none';
    }
  }

  // Ensure we measure the menu *after* it becomes visible, otherwise width/height can be 0
  // and positioning won't clamp correctly.
  menu.style.visibility = 'hidden';
  menu.classList.add('open');

  const padding = 12;
  const rect = menu.getBoundingClientRect();
  const maxX = window.innerWidth - rect.width - padding;
  const maxY = window.innerHeight - rect.height - padding;
  const nextX = Math.min(x, maxX);
  const nextY = Math.min(yPos, maxY);
  menu.style.left = `${Math.max(padding, nextX)}px`;
  menu.style.top = `${Math.max(padding, nextY)}px`;
  menu.style.visibility = '';
  menu.setAttribute('aria-hidden', 'false');
}

function setDocContextMenuMode(menu, mode) {
  const children = Array.from(menu.children);
  if (mode === 'image') {
    children.forEach(child => {
      child.style.display = child.classList.contains('doc-image-item') ? '' : 'none';
    });
    return;
  }

  // text mode
  children.forEach(child => {
    if (child.classList.contains('doc-image-item')) {
      child.style.display = 'none';
    } else {
      child.style.display = '';
    }
  });
}

function closeDocContextMenu() {
  const menu = document.getElementById('doc-context-menu');
  if (!menu) return;
  menu.classList.remove('open');
  menu.setAttribute('aria-hidden', 'true');
  docContextMediaNode = null;
}

function getSelectedDocText() {
  const editor = document.getElementById('doc-editor');
  if (!editor) return '';
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return '';
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return '';
  return selection.toString().trim();
}

async function summarizeSelectedText() {
  const selectionText = getSelectedDocText();
  if (!selectionText) {
    showToast('Select text to summarize', 'error');
    return;
  }

  const panel = document.getElementById('doc-summary-panel');
  const body = document.getElementById('doc-summary-body');
  if (panel && body) {
    body.textContent = 'Summarizing with Aero...';
    openDocSummaryPanel();
  }

  try {
    await checkAeroSafety();
    if (state.aero.banned) {
      throw new Error('Aero is unavailable right now.');
    }

    const data = await callNote26Aero('summarize', selectionText, { length: 'short' });
    const output = data?.output || 'No summary returned.';
    if (body) {
      body.textContent = output;
      body.dataset.summary = output;
    }
  } catch (error) {
    if (body) {
      body.textContent = error.message || 'Aero request failed.';
    }
  }
}

function openDocSummaryPanel() {
  const panel = document.getElementById('doc-summary-panel');
  const menu = document.getElementById('doc-context-menu');
  if (!panel) return;
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');

  const padding = 12;
  const panelRect = panel.getBoundingClientRect();
  let baseLeft = padding;
  let baseTop = padding;

  if (menu && menu.classList.contains('open')) {
    const menuRect = menu.getBoundingClientRect();
    const spaceRight = window.innerWidth - menuRect.right;
    const spaceLeft = menuRect.left;
    const placeRight = spaceRight >= panelRect.width + padding;
    baseTop = menuRect.top;
    if (placeRight) {
      baseLeft = menuRect.right + padding;
    } else {
      baseLeft = Math.max(padding, menuRect.left - panelRect.width - padding);
    }
  }

  const maxX = window.innerWidth - panelRect.width - padding;
  const maxY = window.innerHeight - panelRect.height - padding;
  panel.style.left = `${Math.min(Math.max(padding, baseLeft), maxX)}px`;
  panel.style.top = `${Math.min(Math.max(padding, baseTop), maxY)}px`;
}

function closeDocSummary() {
  const panel = document.getElementById('doc-summary-panel');
  if (!panel) return;
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
}

async function copyDocSummary() {
  const body = document.getElementById('doc-summary-body');
  if (!body) return;
  const text = body.dataset.summary || body.textContent || '';
  if (!text.trim()) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast('Summary copied');
  } catch (error) {
    showToast('Copy failed', 'error');
  }
}

function renderSpreadsheetWorkspace(container, project) {
  state.ui.activeCell = { row: 0, col: 0 };
  container.innerHTML = `
    <div style="height: 100%; display: flex; flex-direction: column; gap: 0.75rem;">
      <div class="sheet-toolbar">
        <button class="btn btn-secondary" onclick="addRow()"><i class="fas fa-plus"></i> Row</button>
        <button class="btn btn-secondary" onclick="addColumn()"><i class="fas fa-plus"></i> Column</button>
      </div>
      <div class="formula-bar">
        <span style="font-weight:600;color:var(--text-muted);">fx</span>
        <input type="text" id="formula-input" placeholder="=SUM(A1:B2)" oninput="updateActiveCellFromFormula(this.value)">
      </div>
      <div class="sheet-grid">
        <table>
          <thead>
            <tr id="sheet-header"><th></th></tr>
          </thead>
          <tbody id="sheet-body"></tbody>
        </table>
      </div>
    </div>
  `;
  renderSpreadsheet(project);
}

function renderSpreadsheet(project) {
  const sheet = project.data.sheet || [];
  const headerRow = document.getElementById('sheet-header');
  const body = document.getElementById('sheet-body');
  const colCount = sheet[0]?.length || 0;

  headerRow.innerHTML = '<th></th>' + Array.from({ length: colCount }, (_, i) => `<th>${String.fromCharCode(65 + i)}</th>`).join('');

  body.innerHTML = sheet.map((row, rowIndex) => `
    <tr>
      <th>${rowIndex + 1}</th>
      ${row.map((cell, colIndex) => `
        <td contenteditable="true" data-cell="${rowIndex}-${colIndex}" onfocus="setActiveCell(${rowIndex}, ${colIndex})" oninput="updateCell(${rowIndex}, ${colIndex}, this.textContent)">${cell}</td>
      `).join('')}
    </tr>
  `).join('');

  setActiveCell(state.ui.activeCell?.row || 0, state.ui.activeCell?.col || 0);
}

function setActiveCell(row, col) {
  state.ui.activeCell = { row, col };
  const formulaInput = document.getElementById('formula-input');
  if (formulaInput) {
    formulaInput.value = state.currentProject?.data.sheet[row]?.[col] || '';
  }
}

function updateCell(row, col, value) {
  if (!state.currentProject) return;
  state.currentProject.data.sheet[row][col] = value;
  state.ui.activeCell = { row, col };
  const formulaInput = document.getElementById('formula-input');
  if (formulaInput && document.activeElement !== formulaInput) {
    formulaInput.value = value;
  }
  saveCurrentProject();
}

function updateActiveCellFromFormula(value) {
  if (!state.currentProject || !state.ui.activeCell) return;
  const { row, col } = state.ui.activeCell;
  state.currentProject.data.sheet[row][col] = value;
  const cell = document.querySelector(`[data-cell="${row}-${col}"]`);
  if (cell && document.activeElement === document.getElementById('formula-input')) {
    cell.textContent = value;
  }
  saveCurrentProject();
}

function addRow() {
  if (!state.currentProject) return;
  const colCount = state.currentProject.data.sheet[0]?.length || 1;
  state.currentProject.data.sheet.push(Array(colCount).fill(''));
  renderSpreadsheet(state.currentProject);
  saveCurrentProject();
}

function addColumn() {
  if (!state.currentProject) return;
  state.currentProject.data.sheet.forEach(row => row.push(''));
  renderSpreadsheet(state.currentProject);
  saveCurrentProject();
}

function renderNotesWorkspace(container, project) {
  container.innerHTML = `
    <div style="max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="display:flex; justify-content: space-between; align-items: center;">
        <h3 style="font-size: 1.5rem; font-weight: 700;">Quick Notes</h3>
        <button class="btn btn-primary" onclick="addNote()"><i class="fas fa-plus"></i> New Note</button>
      </div>
      <div id="notes-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem;"></div>
    </div>
  `;
  renderNotes(project);
}

function renderNotes(project) {
  const container = document.getElementById('notes-grid');
  if (!container) return;
  const notes = project.data.notes || [];

  if (!notes.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <i class="fas fa-sticky-note"></i>
        <h3>No notes yet</h3>
        <p>Create your first note</p>
      </div>
    `;
    return;
  }

  const sortable = notes.map((note, index) => ({ ...note, index }));
  sortable.sort((a, b) => (b.pinned === true) - (a.pinned === true) || (b.timestamp || 0) - (a.timestamp || 0));

  container.innerHTML = sortable.map(note => `
    <div class="note-card ${note.pinned ? 'pinned' : ''}" data-color="${note.color || 'sand'}">
      <div style="display:flex; justify-content: space-between; align-items:center;">
        <input type="text" class="form-input" value="${note.title || 'Untitled'}" oninput="updateNoteTitle(${note.index}, this.value)">
        <div style="display:flex; gap:0.25rem;">
          <button class="btn btn-icon btn-secondary" onclick="togglePin(${note.index})" title="Pin">
            <i class="fas fa-thumbtack"></i>
          </button>
          <button class="btn btn-icon btn-secondary" onclick="deleteNote(${note.index})" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <textarea class="form-input" style="min-height:120px" oninput="updateNoteContent(${note.index}, this.value)">${note.content || ''}</textarea>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <small style="color:var(--text-muted);">${formatDate(note.timestamp || Date.now())}</small>
        <select class="form-input" style="max-width:120px;" onchange="updateNoteColor(${note.index}, this.value)">
          <option value="sand" ${note.color === 'sand' ? 'selected' : ''}>Sand</option>
          <option value="mint" ${note.color === 'mint' ? 'selected' : ''}>Mint</option>
          <option value="sky" ${note.color === 'sky' ? 'selected' : ''}>Sky</option>
        </select>
      </div>
    </div>
  `).join('');
}

function addNote() {
  if (!state.currentProject) return;
  state.currentProject.data.notes.unshift({
    title: 'New Note',
    content: '',
    timestamp: Date.now(),
    color: 'sand',
    pinned: false
  });
  renderNotes(state.currentProject);
  saveCurrentProject();
}

function updateNoteTitle(index, title) {
  if (!state.currentProject) return;
  state.currentProject.data.notes[index].title = title;
  state.currentProject.data.notes[index].timestamp = Date.now();
  saveCurrentProject();
}

function updateNoteContent(index, content) {
  if (!state.currentProject) return;
  state.currentProject.data.notes[index].content = content;
  state.currentProject.data.notes[index].timestamp = Date.now();
  saveCurrentProject();
}

function updateNoteColor(index, color) {
  if (!state.currentProject) return;
  state.currentProject.data.notes[index].color = color;
  saveCurrentProject();
  renderNotes(state.currentProject);
}

function togglePin(index) {
  if (!state.currentProject) return;
  const note = state.currentProject.data.notes[index];
  note.pinned = !note.pinned;
  note.timestamp = Date.now();
  saveCurrentProject();
  renderNotes(state.currentProject);
}

function deleteNote(index) {
  if (!state.currentProject) return;
  if (confirm('Delete this note?')) {
    state.currentProject.data.notes.splice(index, 1);
    renderNotes(state.currentProject);
    saveCurrentProject();
  }
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<strong>${type === 'error' ? 'Error' : 'Success'}</strong><p>${message}</p>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function setSaveStatus(message, mode = 'idle') {
  const status = document.getElementById('save-status');
  if (status) {
    status.textContent = message;
  }
  const dot = document.querySelector('.status-dot');
  if (dot) {
    dot.classList.remove('saving', 'paused');
    if (mode === 'saving') {
      dot.classList.add('saving');
    } else if (mode === 'paused') {
      dot.classList.add('paused');
    }
  }
}

function setupEventBindings() {
  document.getElementById('project-name')?.addEventListener('input', () => {
    if (state.currentProject) {
      state.currentProject.name = document.getElementById('project-name').value;
      document.getElementById('sidebar-project-name').textContent = state.currentProject.name;
      saveCurrentProject();
    }
  });

  document.getElementById('new-project-name')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') createProject();
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (state.view === 'workspace') {
        saveProject();
      }
    }
    if (e.key === 'Escape') {
      closeDocContextMenu();
      closeDocMenus();
      closeOutlinePanel();
      closeDocSummary();
    }
  });

  const searchInput = document.getElementById('project-search');
  if (searchInput) {
    searchInput.value = state.projectFilters.search;
    searchInput.addEventListener('input', (event) => {
      state.projectFilters.search = event.target.value;
      renderProjects();
    });
  }

  const sortSelect = document.getElementById('project-sort');
  if (sortSelect) {
    sortSelect.value = state.projectFilters.sort;
    sortSelect.addEventListener('change', (event) => {
      state.projectFilters.sort = event.target.value;
      renderProjects();
    });
  }

  document.getElementById('import-project-input')?.addEventListener('change', handleImportProject);

  const aeroModal = document.getElementById('aero-modal');
  if (aeroModal) {
    aeroModal.addEventListener('click', (event) => {
      if (event.target === aeroModal) {
        closeAeroModal();
      }
    });
  }

  document.getElementById('aero-action')?.addEventListener?.('change', updateAeroRunButtonLabel);

  document.addEventListener('click', (event) => {
    const menu = document.getElementById('doc-context-menu');
    if (!menu || !menu.classList.contains('open')) return;
    if (Date.now() - docContextMenuOpenedAt < 250) return;
    if (!menu.contains(event.target)) {
      closeDocContextMenu();
    }
  });

  document.addEventListener('click', (event) => {
    const wrap = event.target.closest?.('.doc-menu-wrap');
    if (!wrap) {
      closeDocMenus();
    }
  });

  document.addEventListener('click', (event) => {
    const panel = document.getElementById('doc-summary-panel');
    if (!panel || !panel.classList.contains('open')) return;
    if (!panel.contains(event.target)) {
      closeDocSummary();
    }
  });

  document.addEventListener('scroll', (event) => {
    const menu = document.getElementById('doc-context-menu');
    if (menu && menu.classList.contains('open')) {
      const target = event.target;
      if (target === menu || menu.contains(target)) {
        return;
      }
    }

    const panel = document.getElementById('doc-summary-panel');
    if (panel && panel.classList.contains('open')) {
      const target = event.target;
      if (target === panel || panel.contains(target)) {
        return;
      }
    }

    closeDocContextMenu();
    closeDocMenus();
    closeDocSummary();
  }, true);
}

document.addEventListener('mousemove', handlePointerMove);
document.addEventListener('mouseup', stopElementInteraction);

function bindThemeCards() {
  const radioGroup = document.querySelectorAll('.theme-card input');
  radioGroup.forEach(input => {
    if (input.value === state.settings.theme) {
      input.checked = true;
    }
    input.onchange = (event) => {
      document.getElementById('settings-theme').value = event.target.value;
      saveSettingsFromForm(true);
    };
  });
}

function bindSettingsInteractions() {
  const autosaveToggle = document.getElementById('settings-autosave-enabled');
  const autosaveInterval = document.getElementById('settings-autosave-interval');
  const defaultType = document.getElementById('settings-default-type');
  const compactToggle = document.getElementById('settings-compact-cards');
  const accentToggle = document.getElementById('settings-custom-accent-enabled');
  const accentInput = document.getElementById('settings-custom-accent');

  if (autosaveToggle) autosaveToggle.onchange = () => saveSettingsFromForm(true);
  if (autosaveInterval) autosaveInterval.onchange = () => saveSettingsFromForm(true);
  if (defaultType) defaultType.onchange = () => saveSettingsFromForm(true);
  if (compactToggle) compactToggle.onchange = () => saveSettingsFromForm(true);
  if (accentToggle) accentToggle.onchange = () => saveSettingsFromForm(true);
  if (accentInput) accentInput.oninput = () => saveSettingsFromForm(true);
}

function populateSettingsForm() {
  const themeSelect = document.getElementById('settings-theme');
  const autosaveToggle = document.getElementById('settings-autosave-enabled');
  const autosaveInterval = document.getElementById('settings-autosave-interval');
  const defaultType = document.getElementById('settings-default-type');
  const compactToggle = document.getElementById('settings-compact-cards');
  const accentToggle = document.getElementById('settings-custom-accent-enabled');
  const accentInput = document.getElementById('settings-custom-accent');
  const homeSection1 = document.getElementById('settings-home-section-1');
  const homeSection2 = document.getElementById('settings-home-section-2');

  if (themeSelect) themeSelect.value = state.settings.theme;
  if (autosaveToggle) autosaveToggle.checked = state.settings.autosaveEnabled;
  if (autosaveInterval) autosaveInterval.value = state.settings.autosaveInterval;
  if (defaultType) defaultType.value = state.settings.defaultProjectType;
  if (compactToggle) compactToggle.checked = state.settings.compactCards;
  if (accentToggle) accentToggle.checked = state.settings.customAccentEnabled;
  if (accentInput) {
    accentInput.value = state.settings.customAccent || '#f59e0b';
    accentInput.disabled = !(state.settings.customAccentEnabled);
  }
  if (accentToggle && accentInput) {
    accentToggle.onchange = (event) => {
      accentInput.disabled = !event.target.checked;
    };
  }
  if (homeSection1 && state.settings.homeSections) {
    homeSection1.value = state.settings.homeSections[0] || 'quick-actions';
  }
  if (homeSection2 && state.settings.homeSections) {
    homeSection2.value = state.settings.homeSections[1] || 'recent-projects';
  }

  const themeCard = document.querySelector(`.theme-card input[value="${state.settings.theme}"]`);
  if (themeCard) {
    themeCard.checked = true;
  }
}

function generateElementId() {
  return `el-${Math.random().toString(36).slice(2, 9)}`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function generateAccentSecondary(hex) {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, Math.min(1, l + 0.2));
}

function hexToHsl(hex) {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(ch => ch + ch).join('');
  }
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h, s, l };
}

function hslToHex(h, s, l) {
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (value) => {
    const hex = Math.round(value * 255).toString(16).padStart(2, '0');
    return hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function saveSettingsFromForm(silent = false) {
  const theme = document.getElementById('settings-theme')?.value || state.settings.theme;
  const autosaveEnabled = document.getElementById('settings-autosave-enabled')?.checked ?? state.settings.autosaveEnabled;
  const autosaveInterval = parseInt(document.getElementById('settings-autosave-interval')?.value || state.settings.autosaveInterval, 10);
  const defaultType = document.getElementById('settings-default-type')?.value || state.settings.defaultProjectType;
  const compactCards = document.getElementById('settings-compact-cards')?.checked ?? state.settings.compactCards;
  const customAccentEnabled = document.getElementById('settings-custom-accent-enabled')?.checked ?? state.settings.customAccentEnabled;
  const customAccent = document.getElementById('settings-custom-accent')?.value || state.settings.customAccent;
  const homeSection1 = document.getElementById('settings-home-section-1')?.value || 'quick-actions';
  const homeSection2 = document.getElementById('settings-home-section-2')?.value || 'recent-projects';

  state.settings = {
    ...state.settings,
    theme,
    autosaveEnabled,
    autosaveInterval: Number.isFinite(autosaveInterval) ? autosaveInterval : state.settings.autosaveInterval,
    defaultProjectType: defaultType,
    compactCards,
    customAccentEnabled,
    customAccent,
    homeSections: [homeSection1, homeSection2]
  };

  persistSettings();
  applySettings();
  renderProjects();
  renderHomeSections();
  if (!silent) {
    showToast('Settings updated');
  }
}

function resetSettings() {
  state.settings = { ...DEFAULT_SETTINGS };
  persistSettings();
  applySettings();
  populateSettingsForm();
  renderProjects();
  showToast('Settings reset');
}

let autoSaveTimer = null;

function updateAutoSaveTimer() {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }

  if (!state.settings.autosaveEnabled) {
    return;
  }

  autoSaveTimer = setInterval(() => {
    if (state.view === 'workspace' && state.currentProject) {
      saveCurrentProject();
    }
  }, state.settings.autosaveInterval);
}
