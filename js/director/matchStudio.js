import { getDirectorStudents } from './directorRoom.js';

export let selectedReelAId = null;
export let selectedReelBId = null;
/* =========================================================
   SELECTION STATE
========================================================= */

export function setSelectedReelAId(id) {
  selectedReelAId = id || null;
}

export function setSelectedReelBId(id) {
  selectedReelBId = id || null;
}


/* =========================================================
   NORMALIZE GENDER
========================================================= */

function normalizeGender(gender) {
  return String(gender || "")
    .trim()
    .toLowerCase();
}


/* =========================================================
   CHECK WHETHER STUDENT IS WAITING
========================================================= */

function isWaitingStudent(student) {

  const status =
    String(student?.status || "")
      .trim()
      .toLowerCase();

  return status === "waiting";
}


/* =========================================================
   POPULATE DIRECTOR PICKERS
========================================================= */

export function populateCandidatePickers(students = []) {

  const selectA =
    document.getElementById("select-reel-a");

  const selectB =
    document.getElementById("select-reel-b");

  if (!selectA || !selectB) return;


  /*
   * Only students who are still waiting
   * can participate in a NEW match.
   */

  const waitingStudents =
    students.filter(isWaitingStudent);


  /*
   * Candidate A = MALE
   */

  const maleStudents =
    waitingStudents.filter(student =>
      normalizeGender(student.gender) === "male"
    );


  /*
   * Candidate B = FEMALE
   */

  const femaleStudents =
    waitingStudents.filter(student =>
      normalizeGender(student.gender) === "female"
    );


  /*
   * If the selected student is no longer available,
   * clear the selection.
   */

  if (
    !maleStudents.some(
      student => student.id === selectedReelAId
    )
  ) {
    selectedReelAId = null;
  }


  if (
    !femaleStudents.some(
      student => student.id === selectedReelBId
    )
  ) {
    selectedReelBId = null;
  }


  /*
   * Build dropdown options.
   */

  function buildOptions(
    pool,
    currentVal,
    placeholder
  ) {

    let html =
      `<option value="">${placeholder}</option>`;


    pool.forEach(student => {

      const selected =
        student.id === currentVal
          ? "selected"
          : "";


      const instagram =
        student.instagram_id
          ? `@${String(student.instagram_id)
              .replace(/^@/, "")}`
          : "No Instagram";


      const movie =
        student.favourite_movie ||
        "No movie";


      html += `
        <option
          value="${escapeHtml(student.id)}"
          ${selected}
        >
          ${escapeHtml(student.name)}
          (${escapeHtml(student.department)})
          · ${escapeHtml(student.semester || "—")}
          · ${escapeHtml(instagram)}
          · ${escapeHtml(movie)}
        </option>
      `;
    });


    return html;
  }


  /*
   * Candidate A
   */

  selectA.innerHTML =
    buildOptions(
      maleStudents,
      selectedReelAId,
      "-- Choose Male Student A --"
    );


  /*
   * Candidate B
   */

  selectB.innerHTML =
    buildOptions(
      femaleStudents,
      selectedReelBId,
      "-- Choose Female Student B --"
    );


  /*
   * Candidate A selection
   */

  selectA.onchange = event => {

    selectedReelAId =
      event.target.value || null;

    updateStudioCards();

  };


  /*
   * Candidate B selection
   */

  selectB.onchange = event => {

    selectedReelBId =
      event.target.value || null;

    updateStudioCards();

  };


  /*
   * Refresh the cards immediately.
   */

  updateStudioCards();
}


/* =========================================================
   UPDATE MATCH STUDIO CARDS
========================================================= */

export function updateStudioCards(
  handleCreateMatchCallback
) {

  const students =
    getDirectorStudents();


  const studentA =
    students.find(
      student =>
        student.id === selectedReelAId
    );


  const studentB =
    students.find(
      student =>
        student.id === selectedReelBId
    );


  const setEl = (id, text) => {

    const el =
      document.getElementById(id);

    if (!el) return;

    el.textContent =
      text === undefined ||
      text === null ||
      text === ""
        ? "—"
        : String(text);

  };


  /* =======================================================
     STUDENT A
  ======================================================= */

  setEl(
    "lead-a-name",
    studentA
      ? studentA.name
      : "No Student Selected"
  );


  setEl(
    "lead-a-dept",
    studentA
      ? studentA.department
      : "Department"
  );


  setEl(
    "lead-a-handle",
    studentA?.instagram_id
      ? `@${String(studentA.instagram_id)
          .replace(/^@/, "")}`
      : "@username"
  );


  setEl(
    "lead-a-movie",
    studentA?.favourite_movie || "—"
  );


  setEl(
    "lead-a-genre",
    "—"
  );


  setEl(
    "lead-a-music",
    "—"
  );


  setEl(
    "lead-a-intent",
    studentA?.match_intent || "—"
  );


  setEl(
    "lead-a-status",
    studentA?.status || "—"
  );


  setEl(
    "reel-a-id",
    studentA
      ? `ID #${studentA.id}`
      : "Select Student"
  );


  /* =======================================================
     STUDENT B
  ======================================================= */

  setEl(
    "lead-b-name",
    studentB
      ? studentB.name
      : "No Student Selected"
  );


  setEl(
    "lead-b-dept",
    studentB
      ? studentB.department
      : "Department"
  );


  setEl(
    "lead-b-handle",
    studentB?.instagram_id
      ? `@${String(studentB.instagram_id)
          .replace(/^@/, "")}`
      : "@username"
  );


  setEl(
    "lead-b-movie",
    studentB?.favourite_movie || "—"
  );


  setEl(
    "lead-b-genre",
    "—"
  );


  setEl(
    "lead-b-music",
    "—"
  );


  setEl(
    "lead-b-intent",
    studentB?.match_intent || "—"
  );


  setEl(
    "lead-b-status",
    studentB?.status || "—"
  );


  setEl(
    "reel-b-id",
    studentB
      ? `ID #${studentB.id}`
      : "Select Student"
  );


  /* =======================================================
     MANUAL MATCH INDICATOR
  ======================================================= */

  const affinityPctDisplay =
    document.getElementById(
      "affinity-pct-display"
    );

  const affinityGaugeCircle =
    document.getElementById(
      "affinity-gauge-circle"
    );

  const quoteText =
    document.getElementById(
      "affinity-quote-text"
    );


  /*
   * No compatibility score.
   */

  if (affinityPctDisplay) {
    affinityPctDisplay.textContent = "MANUAL";
  }


  if (affinityGaugeCircle) {
    affinityGaugeCircle.setAttribute(
      "stroke-dashoffset",
      "132"
    );
  }


  setEl(
    "aff-bar-1-val",
    "—"
  );

  setEl(
    "aff-bar-2-val",
    "—"
  );

  setEl(
    "aff-bar-3-val",
    "—"
  );


  const bar1 =
    document.getElementById("aff-bar-1");

  const bar2 =
    document.getElementById("aff-bar-2");

  const bar3 =
    document.getElementById("aff-bar-3");


  if (bar1) bar1.style.width = "0%";
  if (bar2) bar2.style.width = "0%";
  if (bar3) bar3.style.width = "0%";


  /* =======================================================
     DIRECTOR DECISION MESSAGE
  ======================================================= */

  if (quoteText) {

    if (studentA && studentB) {

      quoteText.textContent =
        `Director's selection: ${studentA.name} × ${studentB.name}.`;

    } else {

      quoteText.textContent =
        "Select one male and one female student to prepare a scene.";

    }
  }


  /* =======================================================
     CREATE MATCH BUTTON
  ======================================================= */

  const btnCreateMatch =
    document.getElementById(
      "btn-create-match"
    );


  /*
   * Both students must exist.
   */

  const validPair =
    studentA &&
    studentB &&
    studentA.id !== studentB.id &&
    isWaitingStudent(studentA) &&
    isWaitingStudent(studentB) &&
    normalizeGender(studentA.gender) === "male" &&
    normalizeGender(studentB.gender) === "female";


  if (validPair) {

    if (btnCreateMatch) {

      btnCreateMatch.disabled = false;

      btnCreateMatch.style.opacity = "1";

      btnCreateMatch.style.cursor = "pointer";


      btnCreateMatch.onclick = () => {

        if (
          typeof handleCreateMatchCallback ===
          "function"
        ) {

          handleCreateMatchCallback(
            studentA,
            studentB
          );

        } else if (
          typeof window.handleCreateMatch ===
          "function"
        ) {

          window.handleCreateMatch(
            studentA,
            studentB
          );

        }

      };

    }

  } else {

    if (btnCreateMatch) {

      btnCreateMatch.disabled = true;

      btnCreateMatch.style.opacity = "0.5";

      btnCreateMatch.style.cursor =
        "not-allowed";

      btnCreateMatch.onclick = null;

    }

  }
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}