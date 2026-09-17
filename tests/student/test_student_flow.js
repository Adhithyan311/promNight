/**
 * Student Flow Acceptance Test Suite
 */

import { Storage } from '../../js/storage/storage.js';
import { renderCandidateStatus } from '../../js/student/studentStatus.js';
import { getCostumeLook } from '../../js/student/studentMatch.js';

// Mock localStorage
const mockStorage = {};
globalThis.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

const elements = {};
class MockElement {
  constructor(id = '') {
    this.id = id;
    this.textContent = '';
    this.innerHTML = '';
    this.classList = {
      classes: new Set(),
      add: (c) => this.classList.classes.add(c),
      remove: (c) => this.classList.classes.delete(c),
      contains: (c) => this.classList.classes.has(c)
    };
    this.style = {};
  }
}

function getElem(id) {
  if (!elements[id]) elements[id] = new MockElement(id);
  return elements[id];
}

globalThis.document = {
  getElementById: (id) => getElem(id),
  querySelectorAll: () => [],
  querySelector: () => new MockElement(),
  createElement: () => new MockElement()
};

globalThis.window = {
  localStorage: globalThis.localStorage
};

console.log("=== STUDENT FLOW ACCEPTANCE TEST ===");

// Test candidate status review view
Storage.saveCandidates([{ id: "PL-001", name: "Test Student", department: "CSE S7", instagram: "test_inst", favoriteMovie: "Titanic", favoriteGenre: "Romance", favoriteMusic: "My Heart Will Go On", matchIntent: "romance", role: "candidate", status: "IN REVIEW", registrationDate: "2026-09-16" }]);
Storage.saveSession({ role: "candidate", id: "PL-001" });

renderCandidateStatus();

const umName = getElem("um-cand-name").textContent;
console.log("  Candidate status name populated:", umName);

if (umName === "Test Student") {
  console.log("✓ Student status review test passed.");
} else {
  throw new Error("Student status review test failed.");
}

// Test costume look lookup
const look = getCostumeLook({ favoriteGenre: "Romance", favoriteMovie: "Titanic" });
console.log("  Costume look generated:", look.him ? "YES" : "NO");

if (look.him && look.her) {
  console.log("✓ Student costume look test passed.");
} else {
  throw new Error("Costume look test failed.");
}

console.log("ALL STUDENT FLOW TESTS PASSED! ✨");
