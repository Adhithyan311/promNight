const storageValues = {};
globalThis.localStorage = {
  getItem: key => Object.prototype.hasOwnProperty.call(storageValues, key) ? storageValues[key] : null,
  setItem: (key, value) => { storageValues[key] = String(value); },
  removeItem: key => { delete storageValues[key]; },
  clear: () => { Object.keys(storageValues).forEach(key => delete storageValues[key]); }
};

const mockLocation = { hash: '#/register', replace(value) { this.hash = value; } };

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

globalThis.document = {
  getElementById: id => element(id),
  querySelectorAll: selector => selector === '.intent-chip' ? intentChips : selector.includes('favoriteGenre') ? [genreRadio] : [],
  querySelector: selector => selector.includes('favoriteGenre') ? genreRadio : null,
  addEventListener() {},
  body: { appendChild() {}, removeChild() {} }
};

globalThis.window = {
  localStorage: globalThis.localStorage,
  location: mockLocation,
  addEventListener() {},
  scrollTo() {}
};
globalThis.setTimeout = fn => fn();
globalThis.location = mockLocation;

const { initRegistrationForm } = await import('../../js/registration/registration.js');
const { Storage } = await import('../../js/storage/storage.js');

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

initRegistrationForm();

// 1. Any registration creates a normal student candidate record and redirects to #/status
const firstReg = {
  name: 'FirstUser', branch: 'CSE', semester: 'S10', instagram: 'FIRST_USER',
  favoriteMovie: 'Bangalore Days', favoriteGenre: 'Romance', favoriteMusic: 'Malare',
  matchIntent: 'romance', gender: 'Male'
};
setForm(firstReg);
form.dispatchEvent({ type: 'submit' });

if (mockLocation.hash !== '#/status') throw new Error(`Student registration went to ${mockLocation.hash} instead of #/status`);
if (Storage.getCandidates().length !== 1) throw new Error('Student registration was not persisted as a candidate');
if (JSON.parse(globalThis.localStorage.getItem('pelicula_session')).role !== 'candidate') throw new Error('Student session role should be candidate');

console.log('Director submit flow checks passed.');
