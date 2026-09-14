const fs = require('fs');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, 'js/app.js'), 'utf8');

const mockStorage = {};
const localStorage = {
  getItem: (key) => Object.prototype.hasOwnProperty.call(mockStorage, key) ? mockStorage[key] : null,
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); }
};

class MockElement {
  constructor(id = '') {
    this.id = id;
    this.value = '';
    this.dataset = {};
    this.style = {};
    this.textContent = '';
    this.innerHTML = '';
    this.disabled = false;
    this.listeners = {};
    this.classList = {
      classes: new Set(),
      add: (c) => this.classList.classes.add(c),
      remove: (c) => this.classList.classes.delete(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (this.classList.classes.has(c)) this.classList.classes.delete(c); else this.classList.classes.add(c);
        } else if (force) {
          this.classList.classes.add(c);
        } else {
          this.classList.classes.delete(c);
        }
      }
    };
    this.addEventListener = (evt, fn) => { (this.listeners[evt] ||= []).push(fn); };
    this.dispatchEvent = (evt) => { const handlers = this.listeners[evt.type || evt] || []; handlers.forEach(fn => fn({ type: evt.type || evt, preventDefault: () => {} })); };
    this.reset = () => {};
    this.closest = () => new MockElement();
    this.querySelector = () => new MockElement();
    this.querySelectorAll = () => [];
  }
}

const elements = {};
function getElem(id) { if (!elements[id]) elements[id] = new MockElement(id); return elements[id]; }

const document = {
  getElementById: (id) => getElem(id),
  querySelectorAll: () => [],
  querySelector: () => new MockElement(),
  createElement: () => new MockElement(),
  body: { appendChild: () => {}, removeChild: () => {} },
  addEventListener: () => {}
};

const windowObj = {
  localStorage,
  location: { hash: '#/experience', replace: (value) => { windowObj.location.hash = value; } },
  addEventListener: () => {},
  scrollTo: () => {},
  confirm: () => true,
  Image: function () { this.src = ''; }
};

const context = {
  localStorage, document, window: windowObj, location: windowObj.location, console,
  setTimeout: (fn) => fn(), Math, Date, JSON, Image: windowObj.Image
};

const fn = new Function(...Object.keys(context), code + '\nwindow.__testHooks = { getDirectorRegistrationState, isDirectorAuthenticated, isDirectorRegistration, verifyDirectorIdentity, hasEstablishedDirector, showRoute, resetDirectorSetup };');
fn(...Object.values(context));

const { __testHooks } = windowObj;

if (!__testHooks || typeof __testHooks.getDirectorRegistrationState !== 'function') {
  throw new Error('Missing director setup state API');
}

if (__testHooks.getDirectorRegistrationState() !== false) {
  throw new Error('Expected first-time setup state to be false when unset');
}

if (__testHooks.isDirectorAuthenticated() !== false) {
  throw new Error('Director must not be authenticated before first registration');
}

if (__testHooks.hasEstablishedDirector() !== false) {
  throw new Error('Director must not be established on fresh load');
}

if (typeof __testHooks.resetDirectorSetup !== 'function') {
  throw new Error('Expected reset hook');
}

__testHooks.showRoute('director-room');
if (windowObj.location.hash !== '#/register') {
  throw new Error('Unauthenticated direct Director Room access must be denied');
}

const directorProfile = {
  name: 'FirstUser',
  branch: 'ECE',
  semester: 'S4',
  instagram: 'FIRST_USER',
  favoriteMovie: 'Interstellar',
  favoriteGenre: 'Sci-Fi',
  favoriteMusic: 'Time — Hans Zimmer',
  matchIntent: 'romance',
  gender: 'Female'
};

localStorage.setItem('peliculaDirectorProfile', JSON.stringify(directorProfile));
localStorage.setItem('peliculaDirectorRegistered', 'true');

if (!__testHooks.hasEstablishedDirector()) {
  throw new Error('Director should be recognized as established once profile & flag are saved');
}

const withDetails = (overrides = {}) => ({ ...directorProfile, ...overrides });

if (!__testHooks.verifyDirectorIdentity(withDetails({ name: ' firstuser ', branch: ' eCe ' }), directorProfile)) {
  throw new Error('Director verification should ignore case and surrounding whitespace');
}

['favoriteMovie', 'favoriteMusic'].forEach((field) => {
  if (__testHooks.verifyDirectorIdentity(withDetails({ [field]: field === 'favoriteMovie' ? 'Premam' : 'Vaseegara' }), directorProfile)) {
    throw new Error(`Wrong ${field} must be rejected`);
  }
});

localStorage.setItem('peliculaDirectorAuthenticated', 'true');
localStorage.setItem('pelicula_session', JSON.stringify({ role: 'director', authenticated: true }));
if (__testHooks.isDirectorAuthenticated() !== true) {
  throw new Error('Only the canonical authenticated state grants Director access');
}

localStorage.removeItem('peliculaDirectorAuthenticated');
if (__testHooks.isDirectorAuthenticated() !== false) {
  throw new Error('Director logout must revoke access without deleting the profile');
}

console.log('Director flow checks passed.');
