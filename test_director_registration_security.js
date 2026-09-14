const fs = require('fs');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, 'js/app.js'), 'utf8');
const values = {};
const localStorage = {
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
const document = {
  getElementById: () => element(),
  querySelectorAll: () => [],
  querySelector: () => element(),
  addEventListener() {},
  body: { appendChild() {}, removeChild() {} }
};
const windowObj = {
  localStorage,
  location: { hash: '#/register', replace(value) { this.hash = value; } },
  addEventListener() {},
  scrollTo() {}
};
const context = {
  localStorage, document, window: windowObj, location: windowObj.location,
  console, setTimeout: fn => fn(), Math, Date, JSON
};

const fn = new Function(...Object.keys(context), code + '\nwindow.__testHooks = { isDirectorRegistration, isDirectorAuthenticated, showRoute, Storage };');
fn(...Object.values(context));
const hooks = windowObj.__testHooks;

const director = {
  name: 'FirstDirector', branch: 'CSE', semester: 'S10', instagram: 'FIRST_DIR',
  favoriteMovie: 'Bangalore Days', favoriteGenre: 'Romance',
  favoriteMusic: 'Malare', matchIntent: 'Romance', gender: 'Male'
};

localStorage.setItem('peliculaDirectorProfile', JSON.stringify(director));
localStorage.setItem('peliculaDirectorRegistered', 'true');

if (!hooks.isDirectorRegistration(director)) throw new Error('Exact Director identity was rejected');

for (const [field, value] of Object.entries({
  name: 'Someone', favoriteMovie: 'Premam', favoriteGenre: 'Drama',
  favoriteMusic: 'Vathikkalu Vellaripravu', matchIntent: 'Friendship', gender: 'Female'
})) {
  if (hooks.isDirectorRegistration({ ...director, [field]: value })) {
    throw new Error(`Near-match incorrectly authenticated for ${field}`);
  }
}

if (!hooks.isDirectorRegistration({ ...director, name: '  firstdirector  ', branch: ' cSe ', favoriteMovie: 'Bangalore  Days ' })) {
  throw new Error('Harmless whitespace/case normalization failed');
}

localStorage.setItem('peliculaParticipants', JSON.stringify([
  { ...director, id: 'PL-DIRECTOR', role: 'candidate' },
  { ...director, id: 'PL-CANDIDATE', matchIntent: 'Friendship', role: 'candidate' }
]));
const candidates = hooks.Storage.getCandidates();
if (candidates.some(candidate => candidate.id === 'PL-DIRECTOR')) {
  throw new Error('Director leaked into candidate storage reads');
}
if (!candidates.some(candidate => candidate.id === 'PL-CANDIDATE')) {
  throw new Error('Near-match candidate was incorrectly removed');
}

localStorage.setItem('peliculaDirectorRegistered', 'true');
localStorage.setItem('peliculaDirectorAuthenticated', 'true');
if (hooks.isDirectorAuthenticated()) throw new Error('Registration flag alone must not authorize access');
localStorage.setItem('pelicula_session', JSON.stringify({ role: 'director', authenticated: true }));
windowObj.location.hash = '#/director-room';
hooks.showRoute('director-room');
if (windowObj.location.hash !== '#/director-room') throw new Error('Authenticated Director session was denied');
localStorage.removeItem('peliculaDirectorAuthenticated');
if (hooks.isDirectorAuthenticated()) throw new Error('Director logout marker did not revoke access');

console.log('Director unique-registration security checks passed.');
