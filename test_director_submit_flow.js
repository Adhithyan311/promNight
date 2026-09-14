const fs = require('fs');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, 'js/app.js'), 'utf8');
const storageValues = {};
const localStorage = {
  getItem: key => Object.prototype.hasOwnProperty.call(storageValues, key) ? storageValues[key] : null,
  setItem: (key, value) => { storageValues[key] = String(value); },
  removeItem: key => { delete storageValues[key]; },
  clear: () => { Object.keys(storageValues).forEach(key => delete storageValues[key]); }
};

class MockElement {
  constructor(id, value = '') {
    this.id = id;
    this.value = value;
    this.checked = false;
    this.dataset = {};
    this.style = {};
    this.textContent = '';
    this.innerHTML = '';
    this.listeners = {};
    this.classList = { add() {}, remove() {}, toggle() {} };
  }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  dispatchEvent(event) {
    (this.listeners[event.type] || []).forEach(handler => handler({ preventDefault() {} }));
  }
  reset() {}
  closest() { return new MockElement('closest'); }
  querySelectorAll() { return []; }
}

const elements = {};
const element = (id, value = '') => elements[id] ||= new MockElement(id, value);
const form = element('regForm');
const intentChips = ['romance', 'friendship', 'either'].map(intent => {
  const chip = element(`intent-${intent}`);
  chip.dataset.intent = intent;
  return chip;
});
const genreRadio = element('genre-romance', 'Romance');
genreRadio.checked = true;
const document = {
  getElementById: id => element(id),
  querySelectorAll: selector => selector === '.intent-chip' ? intentChips : selector.includes('favoriteGenre') ? [genreRadio] : [],
  querySelector: selector => selector.includes('favoriteGenre') ? genreRadio : null,
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

const fn = new Function(...Object.keys(context), code + '\nwindow.__testHooks = { initRegistrationForm, Storage };');
fn(...Object.values(context));
const hooks = windowObj.__testHooks;

function setForm(data) {
  element('in-name').value = data.name;
  element('in-branch').value = data.branch;
  element('in-semester').value = data.semester;
  element('in-instagram').value = data.instagram;
  element('in-movie').value = data.favoriteMovie;
  element('in-music').value = data.favoriteMusic;
  element('in-gender').value = data.gender;
  genreRadio.value = data.favoriteGenre;
  genreRadio.checked = true;
  intentChips.forEach(chip => chip.classList = { add() {}, remove() {}, toggle() {} });
  const selectedChip = intentChips.find(chip => chip.dataset.intent === data.matchIntent);
  if (!selectedChip) throw new Error(`Missing intent chip: ${data.matchIntent}`);
  selectedChip.dispatchEvent({ type: 'click' });
}

hooks.initRegistrationForm();

// 1. First registration -> establishes Director profile & authenticates
const firstReg = {
  name: 'FirstUser', branch: 'CSE', semester: 'S10', instagram: 'FIRST_USER',
  favoriteMovie: 'Bangalore Days', favoriteGenre: 'Romance', favoriteMusic: 'Malare',
  matchIntent: 'romance', gender: 'Male'
};
setForm(firstReg);
form.dispatchEvent({ type: 'submit' });
if (windowObj.location.hash !== '#/director-room') throw new Error(`First registration went to ${windowObj.location.hash}`);
if (hooks.Storage.getCandidates().length !== 0) throw new Error('First registration (Director) was persisted as a candidate');
if (JSON.parse(localStorage.getItem('pelicula_session')).role !== 'director') throw new Error('Director session was not persisted');

// Logout Director
localStorage.removeItem('peliculaDirectorAuthenticated');
localStorage.removeItem('pelicula_session');

// 2. Secret Re-entry -> Submitting same exact profile details re-authenticates as Director
windowObj.location.hash = '#/register';
setForm(firstReg);
form.dispatchEvent({ type: 'submit' });
if (windowObj.location.hash !== '#/director-room') throw new Error(`Secret Director re-entry went to ${windowObj.location.hash}`);
if (hooks.Storage.getCandidates().length !== 0) throw new Error('Secret Director re-entry created a candidate record');
if (JSON.parse(localStorage.getItem('pelicula_session')).role !== 'director') throw new Error('Director session was not re-persisted');

// Logout Director again
localStorage.removeItem('peliculaDirectorAuthenticated');
localStorage.removeItem('pelicula_session');

// 3. Normal candidate registration -> Submitting different details registers normal candidate
windowObj.location.hash = '#/register';
const secondReg = {
  name: 'SecondUser', branch: 'ECE', semester: 'S4', instagram: 'SECOND_USER',
  favoriteMovie: 'Titanic', favoriteGenre: 'Romance', favoriteMusic: 'My Heart Will Go On',
  matchIntent: 'romance', gender: 'Female'
};
setForm(secondReg);
form.dispatchEvent({ type: 'submit' });
if (windowObj.location.hash !== '#/status') throw new Error('Second registration did not follow normal candidate status flow');
if (hooks.Storage.getCandidates().length !== 1) throw new Error('Second registration was not persisted as a candidate');

console.log('Director submit flow checks passed.');
