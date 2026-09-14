/**
 * End-to-End Acceptance Test Suite for Película Prom Night — Costume Photo System
 */

const fs = require('fs');
const path = require('path');

const jsContent = fs.readFileSync(path.join(__dirname, 'js/app.js'), 'utf8');
const htmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// Mock localStorage
const mockStorage = {};
const localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

const radioGroups = {};

class MockElement {
  constructor(id = '', tagName = 'div') {
    this.id = id;
    this.tagName = tagName;
    this.value = '';
    this.name = '';
    this.type = '';
    this._checked = false;
    this.textContent = '';
    this.innerHTML = '';
    this.reset = () => {};
    this.setAttribute = () => {};
    this.click = () => {
      const handlers = this.listeners['click'] || [];
      handlers.forEach(fn => fn({ preventDefault: () => {} }));
    };
    this.classList = {
      classes: new Set(),
      add: (c) => this.classList.classes.add(c),
      remove: (c) => this.classList.classes.delete(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (this.classList.classes.has(c)) this.classList.classes.delete(c);
          else this.classList.classes.add(c);
        } else if (force) {
          this.classList.classes.add(c);
        } else {
          this.classList.classes.delete(c);
        }
      },
      contains: (c) => this.classList.classes.has(c)
    };
    this.listeners = {};
    this.dataset = {};
    this.style = {};
  }
  get checked() { return this._checked; }
  set checked(val) {
    if (this.type === 'radio' && val) {
      const group = radioGroups[this.name] || [];
      group.forEach(r => { if (r !== this) r._checked = false; });
    }
    this._checked = val;
  }
  closest() { return new MockElement(); }
  addEventListener(evt, fn) {
    if (!this.listeners[evt]) this.listeners[evt] = [];
    this.listeners[evt].push(fn);
  }
  dispatchEvent(evt) {
    const evtType = (typeof evt === 'string') ? evt : (evt.type || 'submit');
    const handlers = this.listeners[evtType] || [];
    handlers.forEach(fn => fn(typeof evt === 'object' ? evt : { type: evtType, preventDefault: () => {} }));
  }
  querySelector() { return new MockElement(); }
  querySelectorAll() { return []; }
}

const elements = {};
function getElem(id) {
  if (!elements[id]) elements[id] = new MockElement(id);
  return elements[id];
}

const document = {
  getElementById: (id) => getElem(id),
  querySelectorAll: () => [],
  querySelector: () => new MockElement(),
  createElement: (tag) => {
    const el = new MockElement('', tag);
    if (tag === 'canvas') {
      el.getContext = () => ({
        fillRect: () => {}, strokeRect: () => {}, beginPath: () => {}, moveTo: () => {},
        lineTo: () => {}, stroke: () => {}, arc: () => {}, fill: () => {}, fillText: () => {},
        drawImage: () => {}, setLineDash: () => {}, setAttribute: () => {}
      });
      el.toDataURL = () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    }
    return el;
  },
  body: { appendChild: () => {}, removeChild: () => {} },
  addEventListener: () => {}
};

const window = {
  localStorage,
  location: { hash: '#/register' },
  addEventListener: () => {},
  scrollTo: () => {},
  Image: function() { this.src = ''; }
};

const augmentedJs = jsContent + '\nwindow.costumeSets = costumeSets;\nwindow.handleCreateMatch = handleCreateMatch;\nwindow.renderCandidateStatus = renderCandidateStatus;\nwindow.renderCostumeArea = renderCostumeArea;\nwindow.startPromCountdown = startPromCountdown;\n';

const context = {
  localStorage, document, window, location: window.location, console,
  setTimeout: (fn) => fn(), Math, Date, JSON, Image: window.Image
};

const fn = new Function(...Object.keys(context), augmentedJs);
fn(...Object.values(context));

console.log("=== PELÍCULA COSTUME PHOTO SYSTEM TEST SUITE ===\n");

// ----------------------------------------------------
// TEST 1 — ASSET FILES EXISTENCE CHECK
// ----------------------------------------------------
console.log("[TEST 1] Verifying 8 Cropped Costume Asset Files...");
const costumesDir = path.join(__dirname, 'assets/costumes');
const expectedAssets = [
  'set1-boy.jpg', 'set1-girl.jpg',
  'set2-boy.jpg', 'set2-girl.jpg',
  'set3-boy.jpg', 'set3-girl.jpg',
  'set4-boy.jpg', 'set4-girl.jpg'
];

let allAssetsExist = true;
expectedAssets.forEach(f => {
  const p = path.join(costumesDir, f);
  const exists = fs.existsSync(p);
  console.log(`  Asset ${f}:`, exists ? 'EXISTS ✓' : 'MISSING ✗');
  if (!exists) allAssetsExist = false;
});

if (allAssetsExist) {
  console.log("✓ PASSED TEST 1: All 8 cropped costume assets exist as real project files.\n");
} else {
  throw new Error("FAILED TEST 1");
}

// ----------------------------------------------------
// TEST 2 — DETERMINISTIC MATCH COSTUME ROTATION (1..4 -> Set1..4, 5 -> Set1)
// ----------------------------------------------------
console.log("[TEST 2] Testing Match Creation Costume Rotation...");
localStorage.clear();
localStorage.setItem('peliculaDirectorAuthenticated', 'true');
localStorage.setItem('pelicula_session', JSON.stringify({ role: 'director', authenticated: true }));

const assignedSets = [];
const setNames = ["Midnight Black", "Burgundy Romance", "Ivory & Brown", "Midnight Blue"];
const allCands = [];
for (let i = 1; i <= 5; i++) {
  const cA = { id: `PL-A${i}`, name: `Cand A${i}`, gender: "male", role: "candidate", status: "IN REVIEW" };
  const cB = { id: `PL-B${i}`, name: `Cand B${i}`, gender: "female", role: "candidate", status: "IN REVIEW" };
  allCands.push(cA, cB);
}
localStorage.setItem('pelicula_candidates', JSON.stringify(allCands));

for (let i = 1; i <= 5; i++) {
  const cands = JSON.parse(localStorage.getItem('pelicula_candidates'));
  const cA = cands.find(c => c.id === `PL-A${i}`);
  const cB = cands.find(c => c.id === `PL-B${i}`);
  window.handleCreateMatch(cA, cB, 85);
  const matches = JSON.parse(localStorage.getItem('pelicula_matches'));
  const latestMatch = matches[matches.length - 1];
  assignedSets.push(latestMatch.costumeSetId);
  const themeName = setNames[latestMatch.costumeSetId - 1];
  console.log(`  Match #${i} assigned costumeSetId: ${latestMatch.costumeSetId} (${themeName})`);
}

console.log("  Sequence:", assignedSets.join(' → '));

if (
  assignedSets[0] === 1 &&
  assignedSets[1] === 2 &&
  assignedSets[2] === 3 &&
  assignedSets[3] === 4 &&
  assignedSets[4] === 1
) {
  console.log("✓ PASSED TEST 2: Match creation assigns costumeSetId 1→2→3→4→1 deterministically without repeating back-to-back.\n");
} else {
  throw new Error("FAILED TEST 2");
}

// ----------------------------------------------------
// TEST 3 — FIXED ROLES (CAND A = BOY ONLY, CAND B = GIRL ONLY)
// ----------------------------------------------------
console.log("[TEST 3] Testing Fixed Roles (Candidate A = Boy image, Candidate B = Girl image)...");
const matches = JSON.parse(localStorage.getItem('pelicula_matches'));
const match2 = matches[1]; // costumeSetId = 2 (Burgundy Romance)
localStorage.setItem('pelicula_session', JSON.stringify({ role: "candidate", id: match2.candidateAId }));

window.renderCandidateStatus();

const phA = getElem("m-ph-a");
const phB = getElem("m-ph-b");

const phAHasBoyImg = phA.innerHTML.includes("set2-boy.jpg");
const phAHasGirlImg = phA.innerHTML.includes("set2-girl.jpg");
const phBHasBoyImg = phB.innerHTML.includes("set2-boy.jpg");
const phBHasGirlImg = phB.innerHTML.includes("set2-girl.jpg");

console.log("  Candidate A slot contains set2-boy.jpg:", phAHasBoyImg, "and NOT set2-girl.jpg:", !phAHasGirlImg);
console.log("  Candidate B slot contains set2-girl.jpg:", phBHasGirlImg, "and NOT set2-boy.jpg:", !phBHasBoyImg);

if (phAHasBoyImg && !phAHasGirlImg && phBHasGirlImg && !phBHasBoyImg) {
  console.log("✓ PASSED TEST 3: Candidate A ALWAYS shows Boy image; Candidate B ALWAYS shows Girl image.\n");
} else {
  throw new Error("FAILED TEST 3");
}

// ----------------------------------------------------
// TEST 4 — LEGACY MATCH FALLBACK
// ----------------------------------------------------
console.log("[TEST 4] Testing Legacy Match Fallback...");
const legacyMatch = {
  id: "MATCH-LEGACY-999",
  candidateAId: "PL-L1",
  candidateBId: "PL-L2",
  candidateA: { id: "PL-L1", name: "Legacy 1" },
  candidateB: { id: "PL-L2", name: "Legacy 2" },
  affinityScore: 90
};
localStorage.setItem('pelicula_matches', JSON.stringify([legacyMatch]));
localStorage.setItem('pelicula_candidates', JSON.stringify([{ id: "PL-L1", name: "Legacy 1", role: "candidate", status: "MATCHED" }]));
localStorage.setItem('pelicula_session', JSON.stringify({ role: "candidate", id: "PL-L1" }));

window.renderCandidateStatus();

console.log("  Legacy match phA innerHTML contains SET 0:", phA.innerHTML.includes("SET 0"));

if (phA.innerHTML.includes("SET 0")) {
  console.log("✓ PASSED TEST 4: Legacy matches without costumeSetId generate deterministic fallback without crashing.\n");
} else {
  throw new Error("FAILED TEST 4");
}

// ----------------------------------------------------
// TEST 5 — REFRESH & PERSISTENCE CHECK
// ----------------------------------------------------
console.log("[TEST 5] Testing Session Refresh & Persistence...");
const reloadMatches = JSON.parse(localStorage.getItem('pelicula_matches'));
const matchAfterReload = reloadMatches[0];
console.log("  Stored costumeSetId after reload:", matchAfterReload.costumeSetId);

if (matchAfterReload.costumeSetId !== undefined && matchAfterReload.costumeSetId !== null) {
  console.log("✓ PASSED TEST 5: costumeSetId is stored permanently on match record and survives page reloads.\n");
} else {
  throw new Error("FAILED TEST 5");
}

// ----------------------------------------------------
// TEST 6 — LIVE COUNTDOWN TIMER (DAYS/HOURS/MINS/SECS & ZERO-PAD & EVENT STARTED)
// ----------------------------------------------------
console.log("[TEST 6] Testing Live Countdown Timer & Target Date Handlers...");
window.startPromCountdown();

const cdDays = getElem("cd-days");
const cdHours = getElem("cd-hours");
const cdMins = getElem("cd-mins");
const cdSecs = getElem("cd-secs");

console.log("  Populated Days:", cdDays.textContent);
console.log("  Populated Hours:", cdHours.textContent);
console.log("  Populated Mins:", cdMins.textContent);
console.log("  Populated Secs:", cdSecs.textContent);

const isValidDays = cdDays.textContent.length === 2 && !isNaN(parseInt(cdDays.textContent));
const isValidHours = cdHours.textContent.length === 2 && !isNaN(parseInt(cdHours.textContent));
const isValidMins = cdMins.textContent.length === 2 && !isNaN(parseInt(cdMins.textContent));
const isValidSecs = cdSecs.textContent.length === 2 && !isNaN(parseInt(cdSecs.textContent));

if (isValidDays && isValidHours && isValidMins && isValidSecs) {
  console.log("✓ PASSED TEST 6: Countdown displays zero-padded Days/Hours/Minutes/Seconds live.\n");
} else {
  throw new Error("FAILED TEST 6");
}

console.log("==========================================");
console.log("ALL ACCEPTANCE CHECKLIST TESTS PASSED 100%! ✨");
console.log("==========================================");
