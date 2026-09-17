import { 
  isDirectorAuthenticated, 
  authenticateDirector 
} from '../../js/auth/directorAuth.js';
import { Storage } from '../../js/storage/storage.js';
import { showRoute } from '../../js/router/router.js';

const values = {};
globalThis.localStorage = {
  getItem: key => Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null,
  setItem: (key, value) => { values[key] = String(value); },
  removeItem: key => { delete values[key]; },
  clear: () => { Object.keys(values).forEach(key => delete values[key]); }
};

const element = () => ({
  classList: { add() {}, remove() {}, toggle() {} },
  addEventListener() {},
  setAttribute() {},
  querySelectorAll() { return []; },
  reset() {},
  style: {},
  textContent: '',
  innerHTML: ''
});
globalThis.document = {
  getElementById: () => element(),
  querySelectorAll: () => [],
  querySelector: () => element(),
  addEventListener() {},
  body: { appendChild() {}, removeChild() {} }
};
globalThis.window = {
  localStorage: globalThis.localStorage,
  location: { hash: '#/register', replace(value) { this.hash = value; } },
  addEventListener() {},
  scrollTo() {}
};
globalThis.location = globalThis.window.location;

console.log("=== STUDENT REGISTRATION ISOLATION & SECURITY TEST ===");

// 1. Verify student registration creates a normal student candidate
const studentPayload = {
  id: 'PL-101',
  name: 'Any Student',
  branch: 'CSE',
  semester: 'S7',
  instagram: 'student_handle',
  favoriteMovie: 'Titanic',
  favoriteGenre: 'Romance',
  favoriteMusic: 'Soundtrack',
  matchIntent: 'romance',
  gender: 'female',
  role: 'candidate',
  status: 'IN REVIEW'
};

Storage.saveParticipants([studentPayload]);
Storage.saveSession({ role: 'candidate', id: studentPayload.id });

// 2. Student session must NEVER grant Director access
if (isDirectorAuthenticated()) {
  throw new Error('Student registration session must NEVER grant Director access!');
}

// 3. Attempting to navigate to director-room with student session must redirect to director-login
showRoute('director-room');
if (globalThis.window.location.hash !== '#/director-login') {
  throw new Error('Student session attempting to access /director-room must be redirected to #/director-login');
}

// 4. Only explicit email/password authentication grants Director access
const authRes = authenticateDirector('director@same-scene.com', 'director123');
if (!authRes.success || !isDirectorAuthenticated()) {
  throw new Error('Email/password authentication must succeed for valid Director credentials');
}

// 5. Director session allows access to director-room
showRoute('director-room');
if (globalThis.window.location.hash !== '#/director-room') {
  throw new Error('Authenticated Director session must be granted access to #/director-room');
}

console.log('Director unique-registration security checks passed.');
