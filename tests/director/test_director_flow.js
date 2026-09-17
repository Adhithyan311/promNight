import { 
  isDirectorAuthenticated, 
  authenticateDirector, 
  logoutDirector 
} from '../../js/auth/directorAuth.js';
import { showRoute } from '../../js/router/router.js';
import { updateNavState } from '../../js/ui/components.js';

const mockStorage = {};
globalThis.localStorage = {
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
    this.onclick = null;
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
    this.setAttribute = () => {};
    this.reset = () => {};
    this.closest = () => new MockElement();
    this.querySelector = () => new MockElement();
    this.querySelectorAll = () => [];
  }
}

const elements = {};
function getElem(id) { if (!elements[id]) elements[id] = new MockElement(id); return elements[id]; }

globalThis.document = {
  getElementById: (id) => getElem(id),
  querySelectorAll: () => [],
  querySelector: () => new MockElement(),
  createElement: () => new MockElement(),
  body: { appendChild: () => {}, removeChild: () => {} },
  addEventListener: () => {}
};

globalThis.window = {
  localStorage: globalThis.localStorage,
  location: { hash: '#/experience', replace: (value) => { globalThis.window.location.hash = value; } },
  addEventListener: () => {},
  scrollTo: () => {},
  confirm: () => true,
  Image: function () { this.src = ''; }
};
globalThis.location = globalThis.window.location;

console.log("=== DIRECTOR AUTHENTICATION & ROUTE GUARD TEST ===");

if (isDirectorAuthenticated() !== false) {
  throw new Error('Director must not be authenticated on fresh load');
}

// Unauthenticated access check: attempting to open director-room must redirect to director-login
showRoute('director-room');
if (globalThis.window.location.hash !== '#/director-login') {
  throw new Error('Unauthenticated direct Director Room access must redirect to #/director-login');
}

// Invalid email/password auth test
const invalidAuth = authenticateDirector('invalid-email', '');
if (invalidAuth.success) {
  throw new Error('Invalid email/password authentication must fail');
}

// Valid email/password auth test
const validAuth = authenticateDirector('director@same-scene.com', 'director123');
if (!validAuth.success) {
  throw new Error('Valid email/password authentication should succeed');
}

if (isDirectorAuthenticated() !== true) {
  throw new Error('Director should be authenticated after successful login');
}

// Verify profile avatar click NEVER navigates to Director Room
updateNavState();
const avatar = getElem('userAvatar');
if (avatar.onclick && typeof avatar.onclick === 'function') {
  avatar.onclick();
  if (globalThis.window.location.hash === '#/director-room') {
    throw new Error('Avatar click MUST NEVER navigate to Director Room!');
  }
}

// Authenticated route access check
globalThis.window.location.hash = '#/director-room';
showRoute('director-room');
if (globalThis.window.location.hash !== '#/director-room') {
  throw new Error('Authenticated Director access to Director Room must be granted');
}

// Logout check
logoutDirector();
if (isDirectorAuthenticated() !== false) {
  throw new Error('Director logout must revoke authentication state');
}

console.log('Director flow checks passed.');
