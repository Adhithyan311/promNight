/**
 * Película · Prom Night Edition
 * Preserving existing visual design and 35mm cinematic aesthetic.
 */

// ==================== STORAGE MODULE ====================
function normalizeMatchRecord(match, index = 0) {
  if (!match || typeof match !== 'object') return match;
  const safeSetId = match.costumeSetId ?? ((index % 4) + 1);
  const safeMatch = { ...match, costumeSetId: safeSetId };
  if (!safeMatch.serial && safeMatch.id) {
    safeMatch.serial = `MATCH-${String(100000 + (Math.abs(hashString(String(safeMatch.id))) % 899999))}`;
  }
  return safeMatch;
}

function installMatchStorageGuard() {
  if (!window || !localStorage) return;
  const originalSetItem = localStorage.setItem.bind(localStorage);
  const originalGetItem = localStorage.getItem.bind(localStorage);

  localStorage.setItem = function(key, value) {
    if (key === 'pelicula_matches') {
      try {
        const parsed = JSON.parse(String(value));
        if (Array.isArray(parsed)) {
          value = JSON.stringify(parsed.map((match, index) => normalizeMatchRecord(match, index)));
        }
      } catch (error) {
        // ignore non-array payloads and let them pass as-is
      }
    }
    return originalSetItem(key, value);
  };

  localStorage.getItem = function(key) {
    const value = originalGetItem(key);
    if (key !== 'pelicula_matches' || !value) return value;
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) return value;
      const normalized = parsed.map((match, index) => normalizeMatchRecord(match, index));
      const normalizedString = JSON.stringify(normalized);
      if (normalizedString !== value) {
        originalSetItem(key, normalizedString);
      }
      return normalizedString;
    } catch (error) {
      return value;
    }
  };
}

const Storage = {
  getCandidates() {
    try {
      const centralized = localStorage.getItem('peliculaParticipants');
      if (centralized) return this.excludeDirectorRecords(JSON.parse(centralized));
      const data = localStorage.getItem('pelicula_candidates');
      return data ? this.excludeDirectorRecords(JSON.parse(data)) : [];
    } catch(e) { return []; }
  },
  excludeDirectorRecords(candidates) {
    if (!Array.isArray(candidates) || typeof isDirectorRegistration !== 'function') return candidates;
    return candidates.filter(candidate => !isDirectorRegistration(candidate));
  },
  saveCandidates(candidates) {
    localStorage.setItem('peliculaParticipants', JSON.stringify(candidates));
    localStorage.setItem('pelicula_candidates', JSON.stringify(candidates));
  },
  getParticipants() {
    return this.getCandidates();
  },
  saveParticipants(participants) {
    this.saveCandidates(participants);
  },
  getMatches() {
    try {
      const data = localStorage.getItem('pelicula_matches');
      const parsed = data ? JSON.parse(data) : [];
      const normalized = Array.isArray(parsed) ? parsed.map((match, index) => normalizeMatchRecord(match, index)) : [];
      if (JSON.stringify(normalized) !== data) {
        localStorage.setItem('pelicula_matches', JSON.stringify(normalized));
      }
      return normalized;
    } catch(e) { return []; }
  },
  saveMatches(matches) {
    const normalized = Array.isArray(matches) ? matches.map((match, index) => normalizeMatchRecord(match, index)) : [];
    localStorage.setItem('pelicula_matches', JSON.stringify(normalized));
  },
  getSession() {
    try {
      const data = localStorage.getItem('pelicula_session');
      return data ? JSON.parse(data) : null;
    } catch(e) { return null; }
  },
  saveSession(session) {
    localStorage.setItem('pelicula_session', JSON.stringify(session));
  },
  clearSession() {
    localStorage.removeItem('pelicula_session');
  },
  getDirectorData() {
    try {
      const data = localStorage.getItem('peliculaDirectorProfile');
      return data ? JSON.parse(data) : null;
    } catch(e) { return null; }
  },
  saveDirectorData(data) {
    const clean = data ? normalizeRegistrationData(data) : null;
    localStorage.setItem('peliculaDirectorProfile', JSON.stringify(clean));
  },
  clearDirectorAuth() {
    localStorage.removeItem('peliculaDirectorAuthenticated');
  }
};

const DIRECTOR_FIELDS = Object.freeze([
  'name', 'branch', 'semester', 'instagram', 'favoriteMovie',
  'favoriteGenre', 'favoriteMusic', 'matchIntent', 'gender'
]);

function normalizeRegistrationData(formData = {}) {
  return {
    name: formData.name || '',
    branch: formData.branch || '',
    semester: formData.semester || '',
    instagram: String(formData.instagram || '').replace(/^@/, ''),
    favoriteMovie: formData.favoriteMovie || '',
    favoriteGenre: formData.favoriteGenre || '',
    favoriteMusic: formData.favoriteMusic || '',
    matchIntent: formData.matchIntent || '',
    gender: formData.gender || ''
  };
}

function hasEstablishedDirector() {
  return Boolean(Storage.getDirectorData());
}

function getDirectorRegisteredState() {
  const value = localStorage.getItem('peliculaDirectorRegistered');
  return value === 'true' || value === true;
}

function setDirectorRegisteredState(value) {
  localStorage.setItem('peliculaDirectorRegistered', String(Boolean(value)));
}

function isDirectorAuthenticated() {
  const session = Storage && Storage.getSession ? Storage.getSession() : null;
  return localStorage.getItem('peliculaDirectorAuthenticated') === 'true' &&
    Boolean(session && session.role === 'director' && session.authenticated === true);
}

function getDirectorData() {
  return Storage.getDirectorData();
}

function createParticipantObject(payload = {}) {
  return {
    id: payload.id || `PL-${String(Date.now()).slice(-6)}`,
    name: payload.name || '',
    branch: payload.branch || '',
    semester: payload.semester || '',
    instagram: payload.instagram || '',
    favoriteMovie: payload.favoriteMovie || '',
    favoriteGenre: payload.favoriteGenre || '',
    favoriteMusic: payload.favoriteMusic || '',
    matchIntent: payload.matchIntent || 'romance',
    gender: payload.gender || '',
    matchedWith: payload.matchedWith ?? null,
    costumeTheme: payload.costumeTheme ?? null,
    role: 'candidate',
    department: payload.department || `${payload.branch || ''} ${payload.semester || ''}`.trim(),
    handle: payload.instagram || payload.handle || '',
    status: payload.status || 'IN REVIEW',
    registrationDate: payload.registrationDate || new Date().toLocaleDateString()
  };
}

function generateParticipantId() {
  const participants = Storage.getParticipants();
  return `PL-${String(participants.length + 1).padStart(3, '0')}`;
}

function resetDirectorSetup() {
  localStorage.removeItem('peliculaDirectorRegistered');
  localStorage.removeItem('peliculaDirectorProfile');
  localStorage.removeItem('peliculaDirectorAuthenticated');
  localStorage.removeItem('pelicula_session');
  window.location.hash = '#/register';
}

window.resetDirectorSetup = resetDirectorSetup;

// Wipes every candidate, match, session, and director-auth key this app has
// ever written — used both as a manual console helper and by the one-time
// auto-migration below, so old test/demo data left over from earlier builds
// never shows up next to the real Director profile.
function resetAllPeliculaData() {
  const keys = [
    'peliculaParticipants', 'pelicula_candidates', 'pelicula_matches',
    'peliculaDirectorProfile', 'peliculaDirectorRegistered',
    'peliculaDirectorAuthenticated', 'pelicula_session'
  ];
  keys.forEach(k => localStorage.removeItem(k));
  // catch any other pelicula-prefixed keys (older builds used varying names)
  Object.keys(localStorage)
    .filter(k => /pelicula/i.test(k) && !keys.includes(k))
    .forEach(k => localStorage.removeItem(k));
}
window.resetAllPeliculaData = resetAllPeliculaData;

// One-time automatic cleanup: bump this version string any time old stored
// data needs to be invalidated for everyone loading the new build (e.g. this
// director-profile fix). Runs once per browser, then never again.
const PELICULA_DATA_VERSION = 'v4-first-registration-director-refactor';
(function runOneTimeDataMigration() {
  try {
    const stamp = localStorage.getItem('peliculaDataVersion');
    if (stamp !== PELICULA_DATA_VERSION) {
      resetAllPeliculaData();
      localStorage.setItem('peliculaDataVersion', PELICULA_DATA_VERSION);
    }
  } catch (e) { /* localStorage unavailable — ignore */ }
})();

// ==================== SCHEMA MIGRATION ====================
function migrateDataSchema() {
  const candidates = Storage.getCandidates();
  let changed = false;

  candidates.forEach(c => {
    if (!c.favoriteMovie) {
      c.favoriteMovie = c.likedMovie || c.cinematicAffinity || "Thattathin Marayathu";
      changed = true;
    }
    if (!c.favoriteGenre) {
      c.favoriteGenre = c.matchIntent === "romance" ? "Romance" : "Drama";
      changed = true;
    }
    if (!c.favoriteMusic) {
      c.favoriteMusic = "Malare — Vijay Yesudas";
      changed = true;
    }
    if (!c.instagram) {
      c.instagram = c.handle || c.telegram || "username";
      changed = true;
    }
    if (c.handle) {
      c.handle = c.instagram || c.handle;
    }
    if (c.telegram) {
      delete c.telegram;
      changed = true;
    }
  });

  if (changed) {
    Storage.saveCandidates(candidates);
  }
}

// ==================== UTILS ====================
function norm(s) {
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function generateCandidateId() {
  const candidates = Storage.getCandidates();
  const nextNum = candidates.length + 1;
  return 'PL-' + String(nextNum).padStart(3, '0');
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

// ==================== AFFINITY ENGINE ====================
function calculateAffinity(candA, candB) {
  if (!candA || !candB) return 0;
  
  let score = 70; // baseline
  
  const textA = `${candA.favoriteMovie} ${candA.favoriteGenre} ${candA.favoriteMusic} ${candA.department}`;
  const textB = `${candB.favoriteMovie} ${candB.favoriteGenre} ${candB.favoriteMusic} ${candB.department}`;

  const wordsA = norm(textA).split(/[^a-z0-9]+/);
  const wordsB = norm(textB).split(/[^a-z0-9]+/);
  const stopWords = new Set(['the','a','an','and','or','in','of','to','is','for','with','on','at','by','from','s1','s2','s3','s4','s5','s6','s7','s8']);
  const setA = new Set(wordsA.filter(w => w.length > 2 && !stopWords.has(w)));
  const setB = new Set(wordsB.filter(w => w.length > 2 && !stopWords.has(w)));
  
  let common = 0;
  setA.forEach(w => { if (setB.has(w)) common++; });
  score += Math.min(common * 5, 16);
  
  if (norm(candA.favoriteGenre) === norm(candB.favoriteGenre)) {
    score += 7;
  }

  if (candA.matchIntent === candB.matchIntent) {
    score += 5;
  } else if (candA.matchIntent === 'either' || candB.matchIntent === 'either') {
    score += 3;
  }
  
  const seed = (candA.id.charCodeAt(candA.id.length - 1) + candB.id.charCodeAt(candB.id.length - 1)) % 7;
  score += seed;
  
  return Math.max(68, Math.min(98, score));
}

// ==================== CENTRAL COSTUME SETS CONFIG ====================
const costumeSets = {
  1: { id: 1, name: "Midnight Black",   boyImage: "assets/costumes/set1-boy.jpg", girlImage: "assets/costumes/set1-girl.jpg", mood: "Classic · Elegant · Timeless" },
  2: { id: 2, name: "Burgundy Romance", boyImage: "assets/costumes/set2-boy.jpg", girlImage: "assets/costumes/set2-girl.jpg", mood: "Romantic · Warm · Sophisticated" },
  3: { id: 3, name: "Ivory & Brown",    boyImage: "assets/costumes/set3-boy.jpg", girlImage: "assets/costumes/set3-girl.jpg", mood: "Warm · Refined · Vintage" },
  4: { id: 4, name: "Midnight Blue",    boyImage: "assets/costumes/set4-boy.jpg", girlImage: "assets/costumes/set4-girl.jpg", mood: "Modern · Dreamy · Stylish" }
};

function renderCostumeArea(candidateObj, setConfig, tagText, roleType) {
  const setId = setConfig.id;
  const setName = setConfig.name;

  let isBoy = true;
  if (roleType === 'girl' || roleType === 'female' || (candidateObj && candidateObj.gender && candidateObj.gender.toLowerCase() === 'female')) {
    isBoy = false;
  }

  const imgSrc = isBoy ? setConfig.boyImage : setConfig.girlImage;
  const imgAlt = `${setName} - ${isBoy ? 'Boy' : 'Girl'} Look`;

  return `
    <img src="${imgSrc}" alt="${imgAlt}" class="costume-img-single" onerror="this.parentElement.outerHTML='<div class=\\'costume-fallback\\'><b>PROM NIGHT LOOK</b><br>SET 0${setId} - ${setName}<br><span style=\\'font-size:11px;opacity:0.7;\\'>Reference unavailable</span></div>'">
  `;
}

// ==================== COSTUME RECOMMENDATION ENGINE ====================
function getCostumeLook(cand) {
  const genre = norm(cand.favoriteGenre);
  const movie = norm(cand.favoriteMovie);

  if (genre.includes("romance") || movie.includes("thattathin") || movie.includes("titanic")) {
    return {
      him: "Classic black tuxedo &bull; White dress shirt &bull; Satin bow tie &bull; Polished oxford shoes &bull; Minimal gold pocket accent",
      her: "Romantic floor-length gown &bull; Warm burgundy / champagne palette &bull; Pearl necklace &bull; Strappy heels &bull; Silk clutch"
    };
  } else if (genre.includes("musical") || genre.includes("comedy") || movie.includes("jawaani")) {
    return {
      him: "Velvet dinner jacket &bull; Crisp white shirt &bull; Dark tailored trousers &bull; Leather loafers &bull; Statement pocket square",
      her: "Vibrant cocktail dress &bull; Shimmering metallic accessories &bull; Bold lipstick &bull; Elegant dancing heels &bull; Fine bracelet"
    };
  } else if (genre.includes("sci-fi") || genre.includes("thriller") || genre.includes("action") || movie.includes("name")) {
    return {
      him: "Sleek midnight navy suit &bull; Dark fitted shirt &bull; Narrow black tie &bull; Matte black dress shoes &bull; Classic timepiece",
      her: "Sleek monochrome evening gown &bull; Silver geometric jewelry &bull; Dark evening wrap &bull; Stiletto heels &bull; Satin clutch"
    };
  } else {
    return {
      him: "Classic formal suit &bull; White shirt &bull; Black or burgundy tie &bull; Polished black shoes &bull; Minimal gold cuff accent",
      her: "Elegant evening dress &bull; Soft neutral / burgundy / champagne palette &bull; Minimal jewelry &bull; Elegant heels or flats"
    };
  }
}

// ==================== APPLICATION STATE ====================
let selectedIntent = null;
let selectedGenre = null;
let selectedReelAId = null;
let selectedReelBId = null;
let currentDirectoryFilter = 'all';

// ==================== ROUTING ====================
const routes = ["experience", "register", "status", "director-login", "director-room"];

function getDirectorRegistrationState() {
  return getDirectorRegisteredState();
}

function isDirectorRegistration(formData) {
  return verifyDirectorIdentity(formData);
}

function verifyDirectorIdentity(submitted, director = Storage.getDirectorData()) {
  if (!director) return false;
  const normSub = normalizeRegistrationData(submitted);
  const normDir = normalizeRegistrationData(director);
  return DIRECTOR_FIELDS.every(field => norm(normSub[field]) === norm(normDir[field]));
}

function showRoute(route) {
  if (!routes.includes(route)) route = 'experience';

  if (route === 'director-room' && !isDirectorAuthenticated()) {
    location.replace('#/register');
    return;
  }

  routes.forEach(r => {
    const el = document.getElementById('view-' + r);
    if (el) el.classList.toggle('hidden', r !== route);
  });

  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.route === route);
  });

  if (route === 'director-room') {
    renderDirectorLobby();
  } else if (route === 'status') {
    renderCandidateStatus();
  } else if (route === 'experience') {
    updateExperienceStats();
  }

  updateNavState();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function router() {
  const hash = location.hash.replace('#/', '') || 'experience';
  const route = hash || 'experience';

  showRoute(route);
}
window.addEventListener('hashchange', router);

// ==================== NAV STATE ====================
function updateNavState() {
  const session = Storage.getSession();
  const sessionBadge = document.getElementById('sessionBadge');
  const userAvatar = document.getElementById('userAvatar');
  const registered = getDirectorRegisteredState();

  if (session && session.role === 'candidate') {
    if (sessionBadge) {
      sessionBadge.textContent = `🎟 ${session.id}`;
      sessionBadge.classList.remove('hidden');
    }
    if (userAvatar) {
      userAvatar.title = `Candidate ${session.id}`;
      userAvatar.onclick = () => { location.hash = '#/status'; };
    }
  } else if (isDirectorAuthenticated()) {
    if (sessionBadge) {
      sessionBadge.textContent = '🎬 Director';
      sessionBadge.classList.remove('hidden');
    }
    if (userAvatar) {
      userAvatar.title = 'Director';
      userAvatar.onclick = () => { location.hash = '#/director-room'; };
    }
  } else {
    if (sessionBadge) sessionBadge.classList.add('hidden');
    if (userAvatar) {
      userAvatar.title = 'No Active Session';
      userAvatar.onclick = null;
    }
  }
}

// ==================== REGISTRATION & DIRECTOR LOGIC ====================
function initRegistrationForm() {
  const intentChips = document.querySelectorAll(".intent-chip");
  intentChips.forEach(chip => {
    chip.addEventListener("click", () => {
      intentChips.forEach(c => c.classList.remove("selected"));
      chip.classList.add("selected");
      selectedIntent = chip.dataset.intent;
      const intentField = document.getElementById("f-intent");
      if (intentField) intentField.classList.remove("invalid");
    });
  });

  const genreRadios = document.querySelectorAll('input[name="favoriteGenre"]');
  genreRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      genreRadios.forEach(r => {
        const parentLabel = r.closest(".genre-chip");
        if (parentLabel) parentLabel.classList.toggle("selected", r.checked);
      });
      const genreField = document.getElementById("f-genre");
      if (genreField) genreField.classList.remove("invalid");
    });
  });

  const regForm = document.getElementById("regForm");
  if (!regForm) return;

  regForm.addEventListener("submit", function(e) {
    e.preventDefault();
    let valid = true;

    const nameVal = document.getElementById("in-name").value.trim();
    const branchVal = document.getElementById("in-branch").value.trim();
    const semesterVal = document.getElementById("in-semester").value.trim();
    const departmentVal = [branchVal, semesterVal].filter(Boolean).join(' ').trim();
    const instagramVal = document.getElementById("in-instagram").value.trim().replace(/^@/, '');
    const movieVal = document.getElementById("in-movie").value.trim();
    const selectedGenreRadio = document.querySelector('input[name="favoriteGenre"]:checked');
    const genreVal = selectedGenreRadio ? selectedGenreRadio.value.trim() : '';
    const allowedGenres = ["Romance", "Comedy", "Thriller", "Drama", "Action"];
    const isGenreValid = allowedGenres.includes(genreVal);
    const musicVal = document.getElementById("in-music").value.trim();
    const genderVal = document.getElementById("in-gender").value.trim();

    document.getElementById("f-name").classList.toggle("invalid", !nameVal);
    document.getElementById("f-dept").classList.toggle("invalid", !departmentVal);
    document.getElementById("f-handle").classList.toggle("invalid", !instagramVal);
    document.getElementById("f-movie").classList.toggle("invalid", !movieVal);
    document.getElementById("f-genre").classList.toggle("invalid", !isGenreValid);
    document.getElementById("f-music").classList.toggle("invalid", !musicVal);

    const semesterField = document.getElementById("f-semester");
    if (semesterField) semesterField.classList.toggle("invalid", !semesterVal);
    if (!nameVal || !branchVal || !semesterVal || !instagramVal || !movieVal || !isGenreValid || !musicVal || !genderVal) valid = false;

    const intentField = document.getElementById("f-intent");
    if (intentField) intentField.classList.toggle("invalid", !selectedIntent);
    if (!selectedIntent) valid = false;

    const successEl = document.getElementById("regSuccess");

    if (!valid) {
      if (successEl) successEl.textContent = "Please complete all fields in your voucher.";
      return;
    }

    const registrationData = normalizeRegistrationData({
      name: nameVal,
      branch: branchVal,
      semester: semesterVal,
      department: departmentVal,
      instagram: instagramVal,
      favoriteMovie: movieVal,
      favoriteGenre: genreVal,
      favoriteMusic: musicVal,
      gender: norm(genderVal),
      matchIntent: selectedIntent
    });

    if (!hasEstablishedDirector()) {
      Storage.saveDirectorData(registrationData);
      setDirectorRegisteredState(true);
      localStorage.setItem('peliculaDirectorAuthenticated', 'true');
      Storage.saveSession({ role: 'director', authenticated: true });
      if (successEl) successEl.textContent = "First registered dossier recognized as Director. Entering the curation room...";
      setTimeout(() => {
        regForm.reset();
        selectedIntent = null;
        intentChips.forEach(c => c.classList.remove("selected"));
        document.querySelectorAll(".genre-chip").forEach(c => c.classList.remove("selected"));
        location.hash = "#/director-room";
      }, 400);
      return;
    } else if (isDirectorRegistration(registrationData)) {
      setDirectorRegisteredState(true);
      localStorage.setItem('peliculaDirectorAuthenticated', 'true');
      Storage.saveSession({ role: 'director', authenticated: true });
      if (successEl) successEl.textContent = "Director identity recognized. Re-entering the curation room...";
      setTimeout(() => {
        regForm.reset();
        selectedIntent = null;
        intentChips.forEach(c => c.classList.remove("selected"));
        document.querySelectorAll(".genre-chip").forEach(c => c.classList.remove("selected"));
        location.hash = "#/director-room";
      }, 400);
      return;
    }

    const participants = Storage.getParticipants();
    const existingParticipant = participants.find(c =>
      norm(c.name) === norm(nameVal) && norm(c.instagram || c.handle) === norm(instagramVal)
    );

    if (existingParticipant) {
      Storage.saveSession({ role: "candidate", id: existingParticipant.id });
      if (successEl) successEl.textContent = "Existing dossier recognized. Opening Status...";
      setTimeout(() => {
        regForm.reset();
        selectedIntent = null;
        intentChips.forEach(c => c.classList.remove("selected"));
        document.querySelectorAll(".genre-chip").forEach(c => c.classList.remove("selected"));
        location.hash = "#/status";
      }, 400);
      return;
    }

    const newParticipant = createParticipantObject({
      id: generateParticipantId(),
      name: nameVal,
      branch: branchVal,
      semester: semesterVal,
      department: departmentVal,
      instagram: instagramVal,
      handle: instagramVal,
      favoriteMovie: movieVal,
      favoriteGenre: genreVal,
      favoriteMusic: musicVal,
      matchIntent: selectedIntent,
      gender: norm(genderVal),
      matchedWith: null,
      costumeTheme: null,
      role: 'candidate',
      status: 'IN REVIEW',
      registrationDate: new Date().toLocaleDateString()
    });

    participants.push(newParticipant);
    Storage.saveParticipants(participants);
    Storage.saveSession({ role: "candidate", id: newParticipant.id });

    if (document.getElementById("stepDot2")) document.getElementById("stepDot2").classList.add("active");
    if (successEl) successEl.textContent = `Dossier #${newParticipant.id} sealed. Redirecting to Prom Status & Reveal...`;

    setTimeout(() => {
      regForm.reset();
      selectedIntent = null;
      intentChips.forEach(c => c.classList.remove("selected"));
      document.querySelectorAll(".genre-chip").forEach(c => c.classList.remove("selected"));
      document.querySelectorAll('input[name="favoriteGenre"]').forEach(r => r.checked = false);
      location.hash = "#/status";
    }, 400);
  });
}

let selectedDirectorIntent = null;

function initDirectorLogin() {
  const loginForm = document.getElementById("directorLoginForm");
  if (!loginForm) return;

  const directorIntentChips = document.querySelectorAll("[data-director-intent]");
  directorIntentChips.forEach(chip => {
    chip.addEventListener("click", () => {
      directorIntentChips.forEach(c => c.classList.remove("selected"));
      chip.classList.add("selected");
      selectedDirectorIntent = chip.dataset.directorIntent;
      const intentField = document.getElementById("director-verify-f-intent");
      if (intentField) intentField.classList.remove("invalid");
    });
  });

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const errorEl = document.getElementById("directorLoginError");
    const intentField = document.getElementById("director-verify-f-intent");
    if (intentField) intentField.classList.toggle("invalid", !selectedDirectorIntent);

    if (!selectedDirectorIntent) {
      if (errorEl) {
        errorEl.textContent = "Please select a Match Intent.";
        errorEl.style.display = "block";
      }
      return;
    }

    if (!hasEstablishedDirector()) {
      if (errorEl) {
        errorEl.textContent = "No Director has registered yet. The first registration on the site establishes the Director.";
        errorEl.style.display = "block";
      }
      return;
    }

    const submitted = {
      name: document.getElementById("director-verify-name").value.trim(),
      branch: document.getElementById("director-verify-branch").value.trim(),
      semester: document.getElementById("director-verify-semester").value.trim(),
      instagram: document.getElementById("director-verify-instagram").value.trim().replace(/^@/, ''),
      favoriteMovie: document.getElementById("director-verify-movie").value.trim(),
      favoriteGenre: document.getElementById("director-verify-genre").value.trim(),
      favoriteMusic: document.getElementById("director-verify-music").value.trim(),
      matchIntent: selectedDirectorIntent,
      gender: document.getElementById("director-verify-gender").value.trim()
    };

    const validDirector = verifyDirectorIdentity(submitted);

    if (!validDirector) {
      if (errorEl) {
        errorEl.textContent = "Director verification failed.";
        errorEl.style.display = "block";
      }
      return;
    }

    setDirectorRegisteredState(true);
    Storage.saveSession({ role: "director", authenticated: true });
    localStorage.setItem('peliculaDirectorAuthenticated', 'true');
    loginForm.reset();
    selectedDirectorIntent = null;
    directorIntentChips.forEach(c => c.classList.remove("selected"));
    if (errorEl) errorEl.style.display = "none";
    location.replace("#/director-room");
  });
}

// ==================== DIRECTOR LOBBY SYSTEM ====================
function renderDirectorLobby() {
  const candidates = Storage.getCandidates();
  const matches = Storage.getMatches();

  const candidateOnlyList = candidates.filter(c => c.role === "candidate");

  const totalRegistered = candidateOnlyList.length;
  const totalMatched = candidateOnlyList.filter(c => c.status === "MATCHED").length;
  const totalPending = candidateOnlyList.filter(c => c.status === "IN REVIEW").length;

  const statRegEl = document.getElementById("dr-stat-registered");
  const statMatEl = document.getElementById("dr-stat-matched");
  const statPenEl = document.getElementById("dr-stat-pending");

  if (statRegEl) statRegEl.textContent = totalRegistered;
  if (statMatEl) statMatEl.textContent = totalMatched;
  if (statPenEl) statPenEl.textContent = totalPending;

  populateCandidatePickers(candidateOnlyList);
  updateStudioCards();
  renderDirectoryList();
  renderMatchesList();
}

function populateCandidatePickers(candidates) {
  const selectA = document.getElementById("select-reel-a");
  const selectB = document.getElementById("select-reel-b");

  if (!selectA || !selectB) return;

  const unmatched = candidates.filter(c => c.status === "IN REVIEW" && c.role === "candidate");
  const maleCandidates = unmatched.filter(c => norm(c.gender) === 'male');
  const femaleCandidates = unmatched.filter(c => norm(c.gender) === 'female');

  const buildOptions = (pool, currentVal, label) => {
    let html = `<option value="">-- Choose ${label} --</option>`;
    pool.forEach(c => {
      const selected = c.id === currentVal ? 'selected' : '';
      html += `<option value="${c.id}" ${selected}>${c.name} (${c.department}) — #${c.id}</option>`;
    });
    return html;
  };

  if (!maleCandidates.some(c => c.id === selectedReelAId)) selectedReelAId = null;
  if (!femaleCandidates.some(c => c.id === selectedReelBId)) selectedReelBId = null;
  selectA.innerHTML = buildOptions(maleCandidates, selectedReelAId, 'Male Candidate');
  selectB.innerHTML = buildOptions(femaleCandidates, selectedReelBId, 'Female Candidate');

  selectA.onchange = (e) => {
    selectedReelAId = e.target.value;
    updateStudioCards();
  };

  selectB.onchange = (e) => {
    selectedReelBId = e.target.value;
    updateStudioCards();
  };
}

function updateStudioCards() {
  const candidates = Storage.getCandidates();
  const candA = candidates.find(c => c.id === selectedReelAId);
  const candB = candidates.find(c => c.id === selectedReelBId);

  document.getElementById("lead-a-name").textContent = candA ? candA.name : "No Candidate Selected";
  document.getElementById("lead-a-dept").textContent = candA ? candA.department : "Department";
  document.getElementById("lead-a-handle").textContent = candA ? `@${candA.instagram || candA.handle}` : "@username";
  document.getElementById("lead-a-movie").textContent = candA ? (candA.favoriteMovie || candA.cinematicAffinity) : "—";
  document.getElementById("lead-a-genre").textContent = candA ? (candA.favoriteGenre || "—") : "—";
  document.getElementById("lead-a-music").textContent = candA ? (candA.favoriteMusic || "—") : "—";
  document.getElementById("lead-a-intent").textContent = candA ? candA.matchIntent : "—";
  document.getElementById("lead-a-status").textContent = candA ? candA.status : "—";
  document.getElementById("reel-a-id").textContent = candA ? `ID #${candA.id}` : "Select Candidate";

  document.getElementById("lead-b-name").textContent = candB ? candB.name : "No Candidate Selected";
  document.getElementById("lead-b-dept").textContent = candB ? candB.department : "Department";
  document.getElementById("lead-b-handle").textContent = candB ? `@${candB.instagram || candB.handle}` : "@username";
  document.getElementById("lead-b-movie").textContent = candB ? (candB.favoriteMovie || candB.cinematicAffinity) : "—";
  document.getElementById("lead-b-genre").textContent = candB ? (candB.favoriteGenre || "—") : "—";
  document.getElementById("lead-b-music").textContent = candB ? (candB.favoriteMusic || "—") : "—";
  document.getElementById("lead-b-intent").textContent = candB ? candB.matchIntent : "—";
  document.getElementById("lead-b-status").textContent = candB ? candB.status : "—";
  document.getElementById("reel-b-id").textContent = candB ? `ID #${candB.id}` : "Select Candidate";

  const btnCreateMatch = document.getElementById("btn-create-match");
  const affinityGaugeCircle = document.getElementById("affinity-gauge-circle");
  const affinityPctDisplay = document.getElementById("affinity-pct-display");
  const quoteText = document.getElementById("affinity-quote-text");

  if (candA && candB && candA.id !== candB.id) {
    const score = calculateAffinity(candA, candB);
    if (affinityPctDisplay) affinityPctDisplay.textContent = score + "%";

    const dashoffset = 264 - Math.round((score / 100) * 264);
    if (affinityGaugeCircle) affinityGaugeCircle.setAttribute("stroke-dashoffset", String(dashoffset));

    document.getElementById("aff-bar-1-val").textContent = Math.round(score * 0.96) + "%";
    document.getElementById("aff-bar-1").style.width = Math.round(score * 0.96) + "%";

    document.getElementById("aff-bar-2-val").textContent = Math.round(score * 0.88) + "%";
    document.getElementById("aff-bar-2").style.width = Math.round(score * 0.88) + "%";

    document.getElementById("aff-bar-3-val").textContent = Math.round(score * 0.92) + "%";
    document.getElementById("aff-bar-3").style.width = Math.round(score * 0.92) + "%";

    if (quoteText) {
      quoteText.textContent = `"${candA.name} and ${candB.name} demonstrate high cinematographic resonance across '${candA.favoriteMovie}' and '${candB.favoriteMovie}' aesthetics."`;
    }

    if (btnCreateMatch) {
      btnCreateMatch.disabled = false;
      btnCreateMatch.style.opacity = "1";
      btnCreateMatch.style.cursor = "pointer";
      btnCreateMatch.onclick = () => { handleCreateMatch(candA, candB, score); };
    }
  } else {
    if (affinityPctDisplay) affinityPctDisplay.textContent = "0%";
    if (affinityGaugeCircle) affinityGaugeCircle.setAttribute("stroke-dashoffset", "264");
    if (quoteText) quoteText.textContent = "Select two candidates to calculate filmic resonance and validate Prom Night compatibility.";
    if (btnCreateMatch) {
      btnCreateMatch.disabled = true;
      btnCreateMatch.style.opacity = "0.5";
      btnCreateMatch.style.cursor = "not-allowed";
      btnCreateMatch.onclick = null;
    }
  }
}

function handleCreateMatch(candA, candB, score) {
  if (!isDirectorAuthenticated() || !candA || !candB || norm(candA.gender) !== 'male' || norm(candB.gender) !== 'female') return;
  const matches = Storage.getMatches();
  const candidates = Storage.getCandidates();

  const matchIndex = matches.length + 1;
  const costumeSetId = ((matchIndex - 1) % 4) + 1;

  const numSeed = Math.floor(100000 + (Math.abs(hashString(candA.id + candB.id)) % 899999));
  const serialCode = `MATCH-${numSeed}-${candA.id}`;

  const newMatch = {
    id: "MATCH-" + Date.now().toString().slice(-6),
    serial: serialCode,
    candidateAId: candA.id,
    candidateBId: candB.id,
    candidateA: candA,
    candidateB: candB,
    affinityScore: score,
    costumeSetId: costumeSetId,
    createdAt: new Date().toLocaleDateString(),
    status: "matched"
  };

  const idxA = candidates.findIndex(c => c.id === candA.id);
  const idxB = candidates.findIndex(c => c.id === candB.id);

  if (idxA !== -1) candidates[idxA].status = "MATCHED";
  if (idxB !== -1) candidates[idxB].status = "MATCHED";

  matches.push(newMatch);

  Storage.saveCandidates(candidates);
  Storage.saveMatches(matches);

  selectedReelAId = null;
  selectedReelBId = null;

  const msgEl = document.getElementById("match-msg");
  if (msgEl) {
    msgEl.style.display = "block";
    msgEl.textContent = `✓ Curated Prom Match Created: ${candA.name} ↔ ${candB.name} (${score}% Harmony)`;
    setTimeout(() => { msgEl.style.display = "none"; }, 4000);
  }

  renderDirectorLobby();
}

function handleUnmatch(matchId) {
  const matches = Storage.getMatches();
  const candidates = Storage.getCandidates();

  const matchIdx = matches.findIndex(m => m.id === matchId);
  if (matchIdx === -1) return;

  const match = matches[matchIdx];

  const idxA = candidates.findIndex(c => c.id === match.candidateAId);
  const idxB = candidates.findIndex(c => c.id === match.candidateBId);

  if (idxA !== -1) candidates[idxA].status = "IN REVIEW";
  if (idxB !== -1) candidates[idxB].status = "IN REVIEW";

  matches.splice(matchIdx, 1);

  Storage.saveCandidates(candidates);
  Storage.saveMatches(matches);

  renderDirectorLobby();
}

// ==================== DIRECTORY & MATCHES TABS ====================
function renderDirectoryList() {
  const container = document.getElementById("dir-candidates-container");
  if (!container) return;

  const candidates = Storage.getCandidates().filter(c => c.role === "candidate");
  const searchInput = document.getElementById("dir-search-input");
  const q = searchInput ? norm(searchInput.value) : "";

  let filtered = candidates.filter(c => {
    if (currentDirectoryFilter === "pending" && c.status !== "IN REVIEW") return false;
    if (currentDirectoryFilter === "matched" && c.status !== "MATCHED") return false;
    if (q) {
      const target = norm(`${c.name} ${c.department} ${c.instagram} ${c.favoriteMovie} ${c.favoriteGenre} ${c.favoriteMusic} ${c.id}`);
      return target.includes(q);
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:32px;color:var(--muted);font-style:italic;">No candidates found in dossier archive.</div>`;
    return;
  }

  let html = "";
  filtered.forEach(c => {
    const isMatched = c.status === "MATCHED";
    const statusClass = isMatched ? "matched" : "in-review";

    html += `
      <div class="directory-card">
        <div class="info-col">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
            <h4>${c.name}</h4>
            <span class="status-badge ${statusClass}">${c.status}</span>
            <span style="font-size:10px;color:var(--gold);">#${c.id}</span>
          </div>
          <div class="sub-info">
            Branch/Sem: <b>${c.department}</b> &nbsp;·&nbsp; Instagram: <b>@${c.instagram || c.handle}</b> &nbsp;·&nbsp; Intent: <b>${c.matchIntent}</b>
          </div>
          <div style="font-size:12px;color:var(--cream-text);margin-top:4px;">
            🎬 <b>Movie:</b> ${c.favoriteMovie || '—'} &nbsp;|&nbsp;
            ✨ <b>Genre:</b> ${c.favoriteGenre || '—'} &nbsp;|&nbsp;
            🎵 <b>Music:</b> ${c.favoriteMusic || '—'}
          </div>
        </div>
        <div class="actions">
          ${!isMatched ? `
            <button class="btn btn-outline btn-sm" onclick="selectForReel('${c.id}', 'A')">Cast Reel A</button>
            <button class="btn btn-outline btn-sm" onclick="selectForReel('${c.id}', 'B')">Cast Reel B</button>
          ` : `<span style="font-size:11px;color:var(--muted);">Prom Pair</span>`}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

window.selectForReel = function(candId, reel) {
  if (reel === 'A') selectedReelAId = candId;
  if (reel === 'B') selectedReelBId = candId;

  switchDirectorTab('studio');
  updateStudioCards();
};

function renderMatchesList() {
  const container = document.getElementById("dir-matches-container");
  if (!container) return;

  const matches = Storage.getMatches();

  if (matches.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:32px;color:var(--muted);font-style:italic;">No curated matches created yet. Select candidates in Matchmaking Studio to pair reels.</div>`;
    return;
  }

  let html = "";
  matches.forEach(m => {
    html += `
      <div class="match-card">
        <div class="pair">
          <div class="cand">
            <h4>${m.candidateA ? m.candidateA.name : 'Cineaste A'}</h4>
            <p>${m.candidateA ? m.candidateA.department : ''} · @${m.candidateA ? (m.candidateA.instagram || m.candidateA.handle) : ''}</p>
          </div>
          <div class="versus">⟷ ${m.affinityScore}% ⟷</div>
          <div class="cand">
            <h4>${m.candidateB ? m.candidateB.name : 'Cineaste B'}</h4>
            <p>${m.candidateB ? m.candidateB.department : ''} · @${m.candidateB ? (m.candidateB.instagram || m.candidateB.handle) : ''}</p>
          </div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--muted);margin-bottom:4px;text-align:right;">Serial: #${m.serial || m.id}</div>
          <div style="font-size:10px;color:var(--muted);margin-bottom:6px;text-align:right;">Created: ${m.createdAt}</div>
          <button class="btn btn-outline btn-sm" style="border-color:#9c3b3b;color:#e88a8a;" onclick="confirmUnmatch('${m.id}')">Dissolve Match</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

window.confirmUnmatch = function(matchId) {
  if (confirm("Are you sure you want to dissolve this Prom Night match? Both candidates will return to 'IN REVIEW' status.")) {
    handleUnmatch(matchId);
  }
};

function initDirectorTabs() {
  const tabs = document.querySelectorAll(".dr-tab, .dr-sidebar-link[data-tab]");
  tabs.forEach(tab => {
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      const tabName = tab.dataset.tab;
      if (tabName) switchDirectorTab(tabName);
    });
  });

  const filterAll = document.getElementById("filter-all");
  const filterPending = document.getElementById("filter-pending");
  const filterMatched = document.getElementById("filter-matched");

  if (filterAll) filterAll.onclick = () => { setFilter('all'); };
  if (filterPending) filterPending.onclick = () => { setFilter('pending'); };
  if (filterMatched) filterMatched.onclick = () => { setFilter('matched'); };

  const searchInput = document.getElementById("dir-search-input");
  if (searchInput) {
    searchInput.oninput = () => { renderDirectoryList(); };
  }

  const logoutBtn = document.getElementById("dr-logout-btn");
  if (logoutBtn) {
    logoutBtn.onclick = (e) => {
      e.preventDefault();
      localStorage.removeItem('peliculaDirectorAuthenticated');
      Storage.clearSession();
      updateNavState();
      location.hash = '#/register';
    };
  }
}

function setFilter(filter) {
  currentDirectoryFilter = filter;
  document.querySelectorAll(".filter-chip").forEach(c => {
    c.classList.toggle("active", c.id === `filter-${filter}`);
  });
  renderDirectoryList();
}

function switchDirectorTab(tabName) {
  document.querySelectorAll(".dr-tab").forEach(t => {
    t.classList.toggle("active", t.dataset.tab === tabName);
  });
  document.querySelectorAll(".dr-sidebar-link").forEach(a => {
    a.classList.toggle("active", a.dataset.tab === tabName);
  });

  const studioContent = document.getElementById("dr-tab-content-studio");
  const dirContent = document.getElementById("dr-tab-content-directory");
  const matchesContent = document.getElementById("dr-tab-content-matches");

  if (studioContent) studioContent.classList.toggle("hidden", tabName !== "studio");
  if (dirContent) dirContent.classList.toggle("hidden", tabName !== "directory");
  if (matchesContent) matchesContent.classList.toggle("hidden", tabName !== "matches");

  if (tabName === "directory") renderDirectoryList();
  if (tabName === "matches") renderMatchesList();
}

// ==================== CANDIDATE STATUS & REVEAL SYSTEM ====================
function renderCandidateStatus() {
  const session = Storage.getSession();

  const unmatchedEl = document.getElementById("status-unmatched");
  const matchedEl = document.getElementById("status-matched");
  const lookupEl = document.getElementById("status-lookup");

  if (!session || session.role !== "candidate") {
    if (unmatchedEl) unmatchedEl.classList.add("hidden");
    if (matchedEl) matchedEl.classList.add("hidden");
    if (lookupEl) lookupEl.classList.remove("hidden");
    initLookupForm();
    return;
  }

  const candidates = Storage.getCandidates();
  const cand = candidates.find(c => c.id === session.id);

  if (!cand) {
    Storage.clearSession();
    renderCandidateStatus();
    return;
  }

  if (cand.status === "IN REVIEW") {
    if (matchedEl) matchedEl.classList.add("hidden");
    if (lookupEl) lookupEl.classList.add("hidden");
    if (unmatchedEl) unmatchedEl.classList.remove("hidden");

    document.getElementById("um-cand-name").textContent = cand.name;
    document.getElementById("um-cand-dept").textContent = cand.department;
    document.getElementById("um-cand-id").textContent = `#${cand.id}`;
    document.getElementById("um-cand-handle").textContent = cand.instagram || cand.handle;
    document.getElementById("um-cand-movie").textContent = cand.favoriteMovie || cand.cinematicAffinity;
    document.getElementById("um-cand-genre").textContent = cand.favoriteGenre || "Romance";
    document.getElementById("um-cand-music").textContent = cand.favoriteMusic || "Malare — Vijay Yesudas";
    document.getElementById("um-cand-intent").textContent = cand.matchIntent;
    document.getElementById("um-cand-date").textContent = cand.registrationDate;

    const logoutBtn = document.getElementById("status-unmatched-logout-btn");
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        Storage.clearSession();
        updateNavState();
        renderCandidateStatus();
      };
    }
  } else if (cand.status === "MATCHED") {
    if (unmatchedEl) unmatchedEl.classList.add("hidden");
    if (lookupEl) lookupEl.classList.add("hidden");
    if (matchedEl) matchedEl.classList.remove("hidden");

    const matches = Storage.getMatches();
    let match = matches.find(m => m.candidateAId === cand.id || m.candidateBId === cand.id);

    if (!match) {
      if (unmatchedEl) unmatchedEl.classList.remove("hidden");
      return;
    }

    // Ensure persistent ticket serial code
    if (!match.serial) {
      const numSeed = Math.floor(100000 + (Math.abs(hashString(match.id + cand.id)) % 899999));
      match.serial = `MATCH-${numSeed}-${cand.id}`;
      const mIdx = matches.findIndex(m => m.id === match.id);
      if (mIdx !== -1) {
        matches[mIdx].serial = match.serial;
        Storage.saveMatches(matches);
      }
    }

    const isUserCandA = match.candidateAId === cand.id;
    const candAObj = match.candidateA || { id: match.candidateAId, name: 'Cineaste A', department: 'CSE' };
    const candBObj = match.candidateB || { id: match.candidateBId, name: 'Cineaste B', department: 'ECE' };

    // Retrieve or fallback costumeSetId
    let costumeSetId = match.costumeSetId;
    if (!costumeSetId) {
      const matchIdx = matches.findIndex(m => m.id === match.id);
      costumeSetId = matchIdx !== -1 ? ((matchIdx % 4) + 1) : 1;
      match.costumeSetId = costumeSetId;
      const mIdxInStorage = matches.findIndex(m => m.id === match.id);
      if (mIdxInStorage !== -1) {
        matches[mIdxInStorage].costumeSetId = costumeSetId;
        Storage.saveMatches(matches);
      }
    }
    const setConfig = costumeSets[costumeSetId] || costumeSets[1];

    const tagA = isUserCandA ? `Canister A · You (${candAObj.id})` : `Canister A · Matched Cineaste (${candAObj.id})`;
    const tagB = isUserCandA ? `Canister B · Matched Cineaste (${candBObj.id})` : `Canister B · You (${candBObj.id})`;

    const themeString = `SET 0${setConfig.id} - ${setConfig.name}`;

    const themeElA = document.getElementById("m-theme-a");
    const themeElB = document.getElementById("m-theme-b");
    if (themeElA) themeElA.textContent = themeString;
    if (themeElB) themeElB.textContent = themeString;

    const phA = document.getElementById("m-ph-a");
    const phB = document.getElementById("m-ph-b");

    if (phA) phA.innerHTML = renderCostumeArea(candAObj, setConfig, "", 'boy');
    if (phB) phB.innerHTML = renderCostumeArea(candBObj, setConfig, "", 'girl');

    // Photo A Info (Candidate A - Boy)
    const tagElA = document.getElementById("m-tag-a");
    if (tagElA) tagElA.textContent = tagA;
    const seatElA = document.getElementById("m-seat-a");
    if (seatElA) seatElA.textContent = `FIRST SEAT · BALCONY ROW C`;
    document.getElementById("m-name-a").textContent = candAObj.name;
    document.getElementById("m-dept-a").textContent = candAObj.department;
    document.getElementById("m-movie-a").textContent = candAObj.favoriteMovie || candAObj.cinematicAffinity || "—";
    document.getElementById("m-genre-a").textContent = candAObj.favoriteGenre || "Romance";
    document.getElementById("m-music-a").textContent = candAObj.favoriteMusic || "Malare — Vijay Yesudas";

    const rawInstaA = candAObj.instagram || candAObj.handle || "username";
    document.getElementById("m-insta-a").textContent = rawInstaA.startsWith('@') ? rawInstaA : `@${rawInstaA}`;

    // Photo B Info (Candidate B - Girl)
    const tagElB = document.getElementById("m-tag-b");
    if (tagElB) tagElB.textContent = tagB;
    const seatElB = document.getElementById("m-seat-b");
    if (seatElB) seatElB.textContent = `SECOND SEAT · BALCONY ROW C`;
    document.getElementById("m-name-b").textContent = candBObj.name;
    document.getElementById("m-dept-b").textContent = candBObj.department;
    document.getElementById("m-movie-b").textContent = candBObj.favoriteMovie || candBObj.cinematicAffinity || "—";
    document.getElementById("m-genre-b").textContent = candBObj.favoriteGenre || "Romance";
    document.getElementById("m-music-b").textContent = candBObj.favoriteMusic || "Soundtrack";

    const rawInstaB = candBObj.instagram || candBObj.handle || "username";
    document.getElementById("m-insta-b").textContent = rawInstaB.startsWith('@') ? rawInstaB : `@${rawInstaB}`;

    // Affinity & Seating
    document.getElementById("m-score-pct").textContent = match.affinityScore + "%";
    document.getElementById("m-seats-summary").textContent = `Row C · Seats 11 & 12`;
    document.getElementById("m-cohesion-idx").textContent = (match.affinityScore / 10).toFixed(1) + " / 10 Index";
    document.getElementById("m-ticket-serial").textContent = `Serial: #${match.serial}`;

    // PROM NIGHT COSTUME LOOK SUGGESTIONS
    const costumeLook = getCostumeLook(candAObj);
    const costumeHimEl = document.getElementById("costume-him-text");
    const costumeHerEl = document.getElementById("costume-her-text");
    if (costumeHimEl) costumeHimEl.innerHTML = costumeLook.him;
    if (costumeHerEl) costumeHerEl.innerHTML = costumeLook.her;

    // DOWNLOAD TICKET PASS BUTTON BINDING
    const btnDownloadTicket = document.getElementById("btnDownloadTicket");
    if (btnDownloadTicket) {
      btnDownloadTicket.onclick = (e) => {
        e.preventDefault();
        const currentUser = isUserCandA ? candAObj : candBObj;
        const currentPartner = isUserCandA ? candBObj : candAObj;
        downloadTicketPass(currentUser, currentPartner, match);
      };
    }

    // CONFIRM GALA ATTENDANCE BUTTON BINDING
    const btnConfirmGala = document.getElementById("btnConfirmGala");
    if (btnConfirmGala) {
      btnConfirmGala.onclick = (e) => {
        e.preventDefault();
        btnConfirmGala.textContent = "✓ Gala Attendance Confirmed";
        btnConfirmGala.style.background = "#2F6B3F";
        btnConfirmGala.style.color = "#FFFFFF";
      };
    }

    const logoutBtn = document.getElementById("status-matched-logout-btn");
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        Storage.clearSession();
        updateNavState();
        renderCandidateStatus();
      };
    }
  }
}

// ==================== FUNCTIONAL TICKET DOWNLOAD GENERATOR ====================
function downloadTicketPass(userObj, partnerObj, match) {
  const session = Storage.getSession();
  const candidates = Storage.getCandidates();
  const matches = Storage.getMatches();

  if (!userObj && session && session.role === "candidate") {
    userObj = candidates.find(c => c.id === session.id);
  }

  if (userObj && (!match || !partnerObj)) {
    match = matches.find(m => m.candidateAId === userObj.id || m.candidateBId === userObj.id);
    if (match) {
      const isUserCandA = match.candidateAId === userObj.id;
      userObj = userObj || (isUserCandA ? match.candidateA : match.candidateB);
      partnerObj = partnerObj || (isUserCandA ? match.candidateB : match.candidateA);
    }
  }

  const safeUser = userObj || {
    id: (session && session.id) ? session.id : "PL-001",
    name: "Cineaste",
    department: "CSE S7",
    favoriteMovie: "Thattathin Marayathu",
    favoriteGenre: "Romance",
    favoriteMusic: "Malare — Vijay Yesudas",
    instagram: "username"
  };

  const safePartner = partnerObj || {
    id: "PL-002",
    name: "Prom Partner",
    department: "ECE S5",
    favoriteMovie: "Titanic",
    favoriteGenre: "Romance",
    favoriteMusic: "Soundtrack",
    instagram: "username"
  };

  const safeMatch = match || {
    id: "MATCH-100200",
    serial: `MATCH-315911-${safeUser.id}`,
    affinityScore: 88
  };

  const btn = document.getElementById("btnDownloadTicket");
  if (btn) {
    if (btn.disabled) return;
    btn.disabled = true;
    btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
    btn.textContent = "GENERATING TICKET...";
  }

  const serialCode = safeMatch.serial || `MATCH-315911-${safeUser.id}`;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 650;
    const ctx = canvas.getContext("2d");

    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    logoImg.src = "assets/pelicula-logo.jpg";

    let executed = false;
    const triggerRender = () => {
      if (executed) return;
      executed = true;
      try {
        renderCanvasTicket(ctx, canvas, safeUser, safePartner, safeMatch, serialCode, logoImg, btn);
      } catch (err) {
        console.error("Canvas Ticket Render Error, falling back:", err);
        renderFallbackCanvasTicket(ctx, canvas, safeUser, safePartner, safeMatch, serialCode, btn);
      }
    };

    logoImg.onload = triggerRender;
    logoImg.onerror = triggerRender;

    // Timeout fallback if logo takes > 1.5s
    setTimeout(triggerRender, 1500);
  } catch (err) {
    console.error("Ticket Download System Error:", err);
    if (btn) {
      btn.textContent = "TICKET DOWNLOAD FAILED";
      setTimeout(() => {
        btn.textContent = btn.dataset.originalText || "🎟 Download Ticket Pass";
        btn.disabled = false;
      }, 3000);
    }
  }
}

function renderCanvasTicket(ctx, canvas, userObj, partnerObj, match, serialCode, logoImg, btn) {
  // 1. Dark Void Outer Frame (#1B1210)
  ctx.fillStyle = "#1B1210";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#D9A94C";
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  // 2. Main Ticket Paper Body (#F2E8D3)
  const tx = 40, ty = 40, tw = 1520, th = 570;
  ctx.fillStyle = "#F2E8D3";
  ctx.fillRect(tx, ty, tw, th);

  // Vertical Perforation Line at X = 1160
  const perfX = 1160;
  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = "#9C8B72";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(perfX, ty);
  ctx.lineTo(perfX, ty + th);
  ctx.stroke();
  ctx.setLineDash([]);

  // Top & Bottom Notch Cutouts
  ctx.fillStyle = "#1B1210";
  ctx.beginPath();
  ctx.arc(perfX, ty, 18, 0, Math.PI);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(perfX, ty + th, 18, Math.PI, 0);
  ctx.fill();

  // 3. MAIN TICKET HEADER (Left)
  const logoBoxX = 80, logoBoxY = 70, logoBoxSize = 64;
  ctx.fillStyle = "#241713";
  ctx.fillRect(logoBoxX, logoBoxY, logoBoxSize, logoBoxSize);
  ctx.strokeStyle = "#D9A94C";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(logoBoxX, logoBoxY, logoBoxSize, logoBoxSize);

  if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
    const pad = 6;
    ctx.drawImage(logoImg, logoBoxX + pad, logoBoxY + pad, logoBoxSize - pad * 2, logoBoxSize - pad * 2);
  }

  ctx.fillStyle = "#2B1F16";
  ctx.font = 'bold 34px "Playfair Display", Georgia, serif';
  ctx.fillText("Película", 160, 108);

  ctx.fillStyle = "#7A6A54";
  ctx.font = 'bold 12px "Inter", sans-serif';
  ctx.fillText("PELÍCULA  ·  PROM NIGHT DOUBLE PASS", 160, 128);

  // Top Right Header Badge
  ctx.fillStyle = "#6E2A3B";
  ctx.fillRect(760, 78, 360, 36);
  ctx.fillStyle = "#FBF6EA";
  ctx.font = 'bold 12px "Inter", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("ADMIT TWO  ·  PROM NIGHT SELECTION", 940, 101);
  ctx.textAlign = "left";

  // Hairline Divider 1
  ctx.strokeStyle = "rgba(217, 169, 76, 0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, 160);
  ctx.lineTo(1120, 160);
  ctx.stroke();

  // 4. CINEASTES & PAIRING SECTION
  // Candidate A (Current User)
  ctx.fillStyle = "#7A6A54";
  ctx.font = 'bold 11px "Inter", sans-serif';
  ctx.fillText(`CANISTER A  ·  FIRST SEAT (${userObj.id})`, 80, 195);

  ctx.fillStyle = "#6E2A3B";
  ctx.font = 'italic bold 30px "Playfair Display", Georgia, serif';
  ctx.fillText(userObj.name, 80, 230);

  ctx.fillStyle = "#2B1F16";
  ctx.font = 'bold 14px "Inter", sans-serif';
  ctx.fillText(`Dept: ${userObj.department}`, 80, 255);

  ctx.fillStyle = "#4A3A2C";
  ctx.font = '13px "Inter", sans-serif';
  ctx.fillText(`Movie: "${userObj.favoriteMovie || userObj.cinematicAffinity}"`, 80, 278);
  ctx.fillText(`Music: ${userObj.favoriteMusic || 'Malare'}  |  Instagram: @${userObj.instagram || userObj.handle}`, 80, 298);

  // Harmony Pill
  ctx.fillStyle = "#D9A94C";
  ctx.fillRect(520, 238, 140, 30);
  ctx.fillStyle = "#2B1F16";
  ctx.font = 'bold 12px "Inter", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText(`✦ ${match.affinityScore}% HARMONY`, 590, 258);
  ctx.textAlign = "left";

  // Candidate B (Matched Partner)
  ctx.fillStyle = "#7A6A54";
  ctx.font = 'bold 11px "Inter", sans-serif';
  ctx.fillText(`CANISTER B  ·  MATCHED CINEASTE (${partnerObj.id})`, 700, 195);

  ctx.fillStyle = "#6E2A3B";
  ctx.font = 'italic bold 30px "Playfair Display", Georgia, serif';
  ctx.fillText(partnerObj.name, 700, 230);

  ctx.fillStyle = "#2B1F16";
  ctx.font = 'bold 14px "Inter", sans-serif';
  ctx.fillText(`Dept: ${partnerObj.department}`, 700, 255);

  ctx.fillStyle = "#4A3A2C";
  ctx.font = '13px "Inter", sans-serif';
  ctx.fillText(`Movie: "${partnerObj.favoriteMovie || partnerObj.cinematicAffinity}"`, 700, 278);
  ctx.fillText(`Music: ${partnerObj.favoriteMusic || 'Soundtrack'}  |  Instagram: @${partnerObj.instagram || partnerObj.handle}`, 700, 298);

  // Hairline Divider 2
  ctx.strokeStyle = "rgba(217, 169, 76, 0.4)";
  ctx.beginPath();
  ctx.moveTo(80, 335);
  ctx.lineTo(1120, 335);
  ctx.stroke();

  // 5. EVENT METADATA GRID
  const drawMetaCol = (x, label, val) => {
    ctx.fillStyle = "#7A6A54";
    ctx.font = 'bold 11px "Inter", sans-serif';
    ctx.fillText(label, x, 370);
    ctx.fillStyle = "#2B1F16";
    ctx.font = 'bold 16px "Playfair Display", Georgia, serif';
    ctx.fillText(val, x, 395);
  };

  drawMetaCol(80, "MAIN EVENT", "WELCOME TO THE PROM NIGHT");
  drawMetaCol(420, "ASSIGNED SEATING", "Row C  ·  Seats 11 & 12");
  drawMetaCol(700, "DATE & TIME", "25 Sept 2026  ·  7:30–9:30 PM");
  drawMetaCol(930, "VENUE", "Festival Lawn Gala");

  // Hairline Divider 3
  ctx.strokeStyle = "rgba(217, 169, 76, 0.4)";
  ctx.beginPath();
  ctx.moveTo(80, 435);
  ctx.lineTo(1120, 435);
  ctx.stroke();

  // Bottom Notice
  ctx.fillStyle = "#7A6A54";
  ctx.font = '12px "Inter", sans-serif';
  ctx.fillText("🔒 CONFIDENTIAL PROM PASS  ·  Mutual Instagram handles unlock at Lawn Gala upon gala attendance verification.", 80, 480);

  // 6. RIGHT TICKET STUB (X = 1190 to 1520)
  ctx.fillStyle = "#7A6A54";
  ctx.font = 'bold 11px "Inter", sans-serif';
  ctx.fillText("ADMIT TWO PASS", 1200, 85);

  ctx.fillStyle = "#6E2A3B";
  ctx.font = 'italic bold 22px "Playfair Display", Georgia, serif';
  ctx.fillText("Película Prom Night", 1200, 115);

  ctx.fillStyle = "#2B1F16";
  ctx.font = 'bold 13px "Inter", sans-serif';
  ctx.fillText(`SERIAL: #${serialCode}`, 1200, 145);

  // Validated Badge
  ctx.fillStyle = "#2F6B3F";
  ctx.fillRect(1200, 165, 110, 26);
  ctx.fillStyle = "#EAFFF0";
  ctx.font = 'bold 11px "Inter", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("VALIDATED", 1255, 182);
  ctx.textAlign = "left";

  // QR Code Payload
  const qrPayload = JSON.stringify({
    festival: "Película · Prom Night",
    event: "Prom Night",
    ticket: serialCode,
    candidate: userObj.id,
    status: "validated"
  });

  drawQRCodeOnCanvas(ctx, qrPayload, 1200, 215, 220);

  ctx.fillStyle = "#7A6A54";
  ctx.font = 'bold 10px "Inter", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("SCAN AT PROM ENTRY", 1310, 465);
  ctx.textAlign = "left";

  // Execute PNG Download
  executeDownloadBlob(canvas, `pelicula-prom-night-ticket-${userObj.id}.png`, btn);
}

function renderFallbackCanvasTicket(ctx, canvas, userObj, partnerObj, match, serialCode, btn) {
  renderCanvasTicket(ctx, canvas, userObj, partnerObj, match, serialCode, null, btn);
}

function executeDownloadBlob(canvas, filename, btn) {
  try {
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (btn) {
      btn.textContent = "TICKET DOWNLOADED ✓";
      setTimeout(() => {
        btn.textContent = btn.dataset.originalText || "🎟 Download Ticket Pass";
        btn.disabled = false;
      }, 2500);
    }
  } catch (err) {
    console.error("Blob Download Error:", err);
    if (btn) {
      btn.textContent = "TICKET DOWNLOAD FAILED";
      setTimeout(() => {
        btn.textContent = btn.dataset.originalText || "🎟 Download Ticket Pass";
        btn.disabled = false;
      }, 3000);
    }
  }
}

// Lightweight QR Code Generator on Canvas
function drawQRCodeOnCanvas(ctx, text, x, y, size) {
  const n = 25;
  const cellSize = size / n;
  const grid = Array(n).fill(0).map(() => Array(n).fill(false));
  
  function drawFinder(r, c) {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
          grid[r + i][c + j] = true;
        }
      }
    }
  }
  drawFinder(0, 0);
  drawFinder(0, n - 7);
  drawFinder(n - 7, 0);

  for (let i = 8; i < n - 8; i++) {
    if (i % 2 === 0) {
      grid[6][i] = true;
      grid[i][6] = true;
    }
  }

  const alignR = 18, alignC = 18;
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      if (Math.abs(i) === 2 || Math.abs(j) === 2 || (i === 0 && j === 0)) {
        grid[alignR + i][alignC + j] = true;
      }
    }
  }

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const inTL = r < 9 && c < 9;
      const inTR = r < 9 && c >= n - 8;
      const inBL = r >= n - 8 && c < 9;
      const inTiming = r === 6 || c === 6;
      const inAlign = Math.abs(r - alignR) <= 2 && Math.abs(c - alignC) <= 2;
      
      if (!inTL && !inTR && !inBL && !inTiming && !inAlign) {
        const bit = ((r * 31 + c * 17 + Math.abs(hash)) % 100) > 48;
        grid[r][c] = bit;
      }
    }
  }

  ctx.fillStyle = '#000000';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (grid[r][c]) {
        ctx.fillRect(Math.round(x + c * cellSize), Math.round(y + r * cellSize), Math.ceil(cellSize), Math.ceil(cellSize));
      }
    }
  }
}

function initLookupForm() {
  const form = document.getElementById("lookupForm");
  if (!form) return;

  form.onsubmit = (e) => {
    e.preventDefault();
    const query = norm(document.getElementById("l-query").value);
    const errEl = document.getElementById("lookupErr");

    if (!query) {
      if (errEl) { errEl.style.display = "block"; errEl.textContent = "Please enter your starring name, Instagram handle, or dossier ID."; }
      return;
    }

    const candidates = Storage.getCandidates();
    const found = candidates.find(c =>
      norm(c.name) === query || norm(c.instagram) === query || norm(c.handle) === query || norm(c.id) === query
    );

    if (found) {
      Storage.saveSession({ role: "candidate", id: found.id });
      updateNavState();
      renderCandidateStatus();
    } else {
      if (errEl) { errEl.style.display = "block"; errEl.textContent = "No matching candidate dossier found. Check your details or register a new account."; }
    }
  };
}
// ==================== LIVE COUNTDOWN SYSTEM ====================
let promCountdownInterval = null;

function startPromCountdown() {
  const targetDate = new Date("2026-09-25T19:30:00");

  const update = () => {
    const container = document.getElementById("prom-countdown-container");
    if (!container) return;

    const now = new Date().getTime();
    const distance = targetDate.getTime() - now;

    if (distance <= 0) {
      if (promCountdownInterval) {
        clearInterval(promCountdownInterval);
        promCountdownInterval = null;
      }
      container.innerHTML = `
        <div class="stat-event-started" style="width:100%;text-align:center;padding:10px 0;">
          <div style="font-family:var(--serif);font-size:28px;color:var(--gold);letter-spacing:.08em;">✦ PROM NIGHT HAS BEGUN ✦</div>
          <div style="font-size:11px;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;margin-top:6px;">25 September 2026 · 7:30 PM — 9:30 PM</div>
        </div>
      `;
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    const pad = n => String(n).padStart(2, '0');

    const daysEl = document.getElementById("cd-days");
    const hoursEl = document.getElementById("cd-hours");
    const minsEl = document.getElementById("cd-mins");
    const secsEl = document.getElementById("cd-secs");

    if (daysEl) daysEl.textContent = pad(days);
    if (hoursEl) hoursEl.textContent = pad(hours);
    if (minsEl) minsEl.textContent = pad(minutes);
    if (secsEl) secsEl.textContent = pad(seconds);
  };

  update();
  if (promCountdownInterval) clearInterval(promCountdownInterval);
  promCountdownInterval = setInterval(update, 1000);
}

function updateExperienceStats() {
  startPromCountdown();
}

// ==================== INITIALIZATION ====================
function initializeApp() {
  installMatchStorageGuard();
  migrateDataSchema();
  initRegistrationForm();
  initDirectorLogin();
  initDirectorTabs();

  const resetBtn = document.getElementById('directorResetHiddenBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('Reset Director Setup? This clears the Director account and authenticated session.')) {
        resetDirectorSetup();
      }
    });
  }

  router();

  window.addEventListener("load", () => {
    updateNavState();
  });
}

installMatchStorageGuard();
document.addEventListener("DOMContentLoaded", initializeApp);
