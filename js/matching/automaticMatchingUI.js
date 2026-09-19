// ============================================================
// AUTOMATIC MATCHING UI
// Película · Prom Night
// ============================================================

import {
  generateAutomaticMatches,
  getMatchingBasis
} from "./automaticMatcher.js";

import {
  isDirectorAuthenticated
} from "../auth/directorAuth.js";


// ============================================================
// STATE
// ============================================================

let currentStudents = [];

let generatedResult = null;

let currentBatchId = null;


// ============================================================
// SUPABASE
// ============================================================

const supabaseClient =
  typeof window !== "undefined"
    ? window.supabaseClient
    : null;


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHtml(value) {

  return String(value ?? "")
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


// ============================================================
// ROOT
// ============================================================

function getRoot() {

  return document.getElementById(
    "automatic-matching-root"
  );

}


// ============================================================
// SET STUDENTS
// ============================================================

export function setAutomaticMatchingStudents(
  students = []
) {

  currentStudents =
    Array.isArray(students)
      ? students
      : [];

  console.log(
    "Automatic Matching student list:",
    currentStudents.length
  );

}


// ============================================================
// STUDENT CARD
// ============================================================

function renderStudent(
  student
) {

  const instagram =
    String(
      student?.instagram_id || ""
    )
      .trim()
      .replace(
        /^@/,
        ""
      );


  return `
    <div class="auto-student">

      <div class="auto-student-name">
        ${escapeHtml(
          student?.name
        )}
      </div>

      <div class="auto-student-meta">
        ${escapeHtml(
          student?.department
        )}
        ·
        ${escapeHtml(
          student?.semester
        )}
      </div>

      <div class="auto-student-movie">
        ${escapeHtml(
          student?.favourite_movie
        )}
      </div>

      ${
        instagram
          ? `
            <div class="auto-student-instagram">
              @${escapeHtml(
                instagram
              )}
            </div>
          `
          : ""
      }

    </div>
  `;

}


// ============================================================
// PAIR CARD
// ============================================================

function renderPair(
  pair,
  index
) {

  const basis =
    getMatchingBasis(
      pair.male,
      pair.female
    );


  return `
    <article class="auto-pair-card">

      <div class="auto-pair-number">
        PAIR
        ${String(
          index + 1
        ).padStart(
          2,
          "0"
        )}
      </div>


      <div class="auto-pair">


        <!-- MALE -->

        <div class="auto-person">

          <div class="auto-gender-label">
            MALE
          </div>

          ${renderStudent(
            pair.male
          )}

        </div>


        <!-- HEART -->

        <div class="auto-heart">
          ♥
        </div>


        <!-- FEMALE -->

        <div class="auto-person">

          <div class="auto-gender-label">
            FEMALE
          </div>

          ${renderStudent(
            pair.female
          )}

        </div>


      </div>


      <!-- BASIS -->

      <div class="auto-basis">

        <div class="auto-basis-title">
          MATCHING BASIS
        </div>

        <div class="auto-basis-items">

          ${basis.map(
            item => `
              <span class="auto-basis-chip">
                ✓
                ${escapeHtml(
                  item
                )}
              </span>
            `
          ).join("")}

        </div>

      </div>


    </article>
  `;

}


// ============================================================
// INITIAL PANEL
// ============================================================

function renderInitialPanel() {

  const root =
    getRoot();

  if (!root) return;


  root.innerHTML = `

    <div class="automatic-empty">


      <div class="automatic-title">
        AUTOMATIC MATCHING
      </div>


      <div class="automatic-description">

        Generate one-to-one
        Male ↔ Female match
        suggestions from students
        currently waiting.

      </div>


      <div class="automatic-rule-note">

        Only Male ↔ Female pairs
        are eligible.

        Same-gender pairs will never
        be generated.

      </div>


      <button
        type="button"
        class="btn btn-primary"
        id="generate-automatic-matches"
      >
        GENERATE MATCHES
      </button>


    </div>

  `;


  const button =
    document.getElementById(
      "generate-automatic-matches"
    );


  if (button) {

    button.onclick =
      generateAutomaticMatchesForUI;

  }

}


// ============================================================
// GENERATE
// ============================================================

async function generateAutomaticMatchesForUI() {

  if (
    !isDirectorAuthenticated()
  ) {

    alert(
      "Director authentication is required."
    );

    return;

  }


  const button =
    document.getElementById(
      "generate-automatic-matches"
    );


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "GENERATING...";

  }


  try {

    // --------------------------------------------------------
    // Use ONLY the current Director Room student list.
    // --------------------------------------------------------

    generatedResult =
      generateAutomaticMatches(
        currentStudents
      );


    currentBatchId =
      crypto.randomUUID();


    renderResults();


  } catch (error) {

    console.error(
      "Automatic matching error:",
      error
    );


    alert(
      error?.message ||
      "Unable to generate automatic matches."
    );


  }

}


// ============================================================
// UNMATCHED MESSAGE
// ============================================================

function renderUnmatchedMessage(
  result
) {

  const unmatchedMales =
    result?.unmatchedMales || [];

  const unmatchedFemales =
    result?.unmatchedFemales || [];


  if (
    unmatchedMales.length === 0 &&
    unmatchedFemales.length === 0
  ) {

    return `
      <div class="automatic-balanced">
        All eligible students have been paired.
      </div>
    `;

  }


  return `

    <div class="automatic-unmatched warning">

      <strong>
        Some students remain unmatched.
      </strong>


      ${
        unmatchedMales.length > 0
          ? `
            <span>
              ${unmatchedMales.length}
              male student${
                unmatchedMales.length === 1
                  ? ""
                  : "s"
              }
              remain unmatched.
            </span>
          `
          : ""
      }


      ${
        unmatchedFemales.length > 0
          ? `
            <span>
              ${unmatchedFemales.length}
              female student${
                unmatchedFemales.length === 1
                  ? ""
                  : "s"
              }
              remain unmatched.
            </span>
          `
          : ""
      }


      <span>
        The remaining students will stay
        in the waiting pool and will not
        be matched automatically.
      </span>

    </div>

  `;

}


// ============================================================
// RENDER RESULTS
// ============================================================

function renderResults() {

  const root =
    getRoot();

  if (!root) return;


  if (!generatedResult) {

    renderInitialPanel();

    return;

  }


  const pairs =
    generatedResult.pairs || [];

  const males =
    generatedResult.males || [];

  const females =
    generatedResult.females || [];


  // ----------------------------------------------------------
  // No pairs
  // ----------------------------------------------------------

  if (
    pairs.length === 0
  ) {

    root.innerHTML = `

      <div class="automatic-results">

        <div class="automatic-title">
          AUTOMATIC MATCH RESULTS
        </div>


        <div class="automatic-empty-message">

          No eligible Male ↔ Female
          pairs could be generated.

        </div>


        <div class="automatic-summary">

          <div class="automatic-summary-item">
            <span>WAITING MALES</span>
            <strong>
              ${males.length}
            </strong>
          </div>


          <div class="automatic-summary-item">
            <span>WAITING FEMALES</span>
            <strong>
              ${females.length}
            </strong>
          </div>


          <div class="automatic-summary-item">
            <span>PAIRS</span>
            <strong>
              0
            </strong>
          </div>

        </div>


        ${renderUnmatchedMessage(
          generatedResult
        )}


        <button
          type="button"
          class="btn btn-secondary"
          id="regenerate-automatic-matches"
        >
          CHECK AGAIN
        </button>

      </div>

    `;


    document.getElementById(
      "regenerate-automatic-matches"
    ).onclick =
      generateAutomaticMatchesForUI;


    return;

  }


  // ----------------------------------------------------------
  // Results
  // ----------------------------------------------------------

  root.innerHTML = `

    <div class="automatic-results">


      <div class="automatic-results-header">

        <div>

          <div class="automatic-title">
            AUTOMATIC MATCH RESULTS
          </div>

          <div class="automatic-count">
            ${pairs.length}
            pair${
              pairs.length === 1
                ? ""
                : "s"
            }
            generated
          </div>

        </div>


        <button
          type="button"
          class="btn btn-secondary"
          id="regenerate-automatic-matches"
        >
          REGENERATE
        </button>

      </div>


      <div class="automatic-summary">


        <div class="automatic-summary-item">

          <span>
            WAITING MALES
          </span>

          <strong>
            ${males.length}
          </strong>

        </div>


        <div class="automatic-summary-item">

          <span>
            WAITING FEMALES
          </span>

          <strong>
            ${females.length}
          </strong>

        </div>


        <div class="automatic-summary-item">

          <span>
            PAIRS GENERATED
          </span>

          <strong>
            ${pairs.length}
          </strong>

        </div>


      </div>


      ${renderUnmatchedMessage(
        generatedResult
      )}


      <div class="automatic-pairs">

        ${pairs.map(
          (
            pair,
            index
          ) =>
            renderPair(
              pair,
              index
            )
        ).join("")}

      </div>


      <div class="automatic-actions">

        <button
          type="button"
          class="btn btn-primary"
          id="create-automatic-drafts"
        >
          CREATE DRAFT MATCHES
        </button>

      </div>


    </div>

  `;


  document.getElementById(
    "regenerate-automatic-matches"
  ).onclick =
    generateAutomaticMatchesForUI;


  document.getElementById(
    "create-automatic-drafts"
  ).onclick =
    createAutomaticDrafts;

}


// ============================================================
// CREATE DRAFT MATCHES
// ============================================================

async function createAutomaticDrafts() {

  if (
    !generatedResult ||
    !generatedResult.pairs ||
    generatedResult.pairs.length === 0
  ) {

    return;

  }


  if (
    !isDirectorAuthenticated()
  ) {

    alert(
      "Director authentication is required."
    );

    return;

  }


  if (!supabaseClient) {

    alert(
      "Supabase is not available."
    );

    return;

  }


  const button =
    document.getElementById(
      "create-automatic-drafts"
    );


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "CREATING DRAFTS...";

  }


  try {

    // --------------------------------------------------------
    // Final validation against fresh database data.
    // --------------------------------------------------------

    const pairRows = [];


    for (
      const pair
      of generatedResult.pairs
    ) {

      const maleId =
        pair.male.id;

      const femaleId =
        pair.female.id;


      if (
        maleId === femaleId
      ) {

        throw new Error(
          "A student cannot be matched with themselves."
        );

      }


      // ------------------------------------------------------
      // Fetch both students again.
      // ------------------------------------------------------

      const {
        data,
        error
      } =
        await supabaseClient
          .from("students")
          .select(`
            id,
            gender,
            status
          `)
          .in(
            "id",
            [
              maleId,
              femaleId
            ]
          );


      if (error) {
        throw error;
      }


      const latestMale =
        data?.find(
          student =>
            student.id ===
            maleId
        );


      const latestFemale =
        data?.find(
          student =>
            student.id ===
            femaleId
        );


      if (
        !latestMale ||
        !latestFemale
      ) {

        throw new Error(
          "One or more students could not be found. Generate the automatic matches again."
        );

      }


      // ------------------------------------------------------
      // FINAL GENDER CHECK
      // ------------------------------------------------------

      if (
        String(
          latestMale.gender || ""
        )
          .trim()
          .toLowerCase() !==
        "male"
      ) {

        throw new Error(
          "Automatic matching allows only Male ↔ Female pairs."
        );

      }


      if (
        String(
          latestFemale.gender || ""
        )
          .trim()
          .toLowerCase() !==
        "female"
      ) {

        throw new Error(
          "Automatic matching allows only Male ↔ Female pairs."
        );

      }


      // ------------------------------------------------------
      // FINAL WAITING CHECK
      // ------------------------------------------------------

      if (
        String(
          latestMale.status || ""
        )
          .trim()
          .toLowerCase() !==
        "waiting"
      ) {

        throw new Error(
          "A selected male student is no longer waiting. Generate the matches again."
        );

      }


      if (
        String(
          latestFemale.status || ""
        )
          .trim()
          .toLowerCase() !==
        "waiting"
      ) {

        throw new Error(
          "A selected female student is no longer waiting. Generate the matches again."
        );

      }


      pairRows.push({

        student_a_id:
          maleId,

        student_b_id:
          femaleId,

        status:
          "draft"

      });

    }


    // --------------------------------------------------------
    // INSERT ALL DRAFTS
    // --------------------------------------------------------

    const {
      data,
      error
    } =
      await supabaseClient
        .from("matches")
        .insert(
          pairRows
        )
        .select();


    if (error) {
      throw error;
    }


    const createdCount =
      data?.length ||
      pairRows.length;


    alert(
      `${createdCount} automatic draft match${
        createdCount === 1
          ? ""
          : "es"
      } created successfully.`
    );


    // --------------------------------------------------------
    // Clear generated results.
    // --------------------------------------------------------

    generatedResult =
      null;

    currentBatchId =
      null;


    // --------------------------------------------------------
    // Refresh Director Room.
    // --------------------------------------------------------

    if (
      typeof window.refreshDirectorRoom ===
      "function"
    ) {

      await window.refreshDirectorRoom();

    }


    renderResults();


  } catch (error) {

    console.error(
      "Automatic draft creation error:",
      error
    );


    // Duplicate student constraint
    if (
      error?.code ===
      "23505"
    ) {

      alert(
        "One or more students already belong to a match. Please generate the automatic matches again."
      );

    } else {

      alert(
        error?.message ||
        "Unable to create automatic draft matches."
      );

    }


  } finally {

    if (button) {

      button.disabled =
        false;

      button.textContent =
        "CREATE DRAFT MATCHES";

    }

  }

}


// ============================================================
// INITIALIZE SWITCH
// ============================================================

export function initializeMatchingModeSwitch() {

  const manualPanel =
    document.querySelector(
      ".curate-grid"
    );


  if (!manualPanel) {

    console.warn(
      "Automatic Matching: .curate-grid not found."
    );

    return;

  }


  // ----------------------------------------------------------
  // If switch already exists, don't create another.
  // ----------------------------------------------------------

  if (
    document.getElementById(
      "matching-mode-switch"
    )
  ) {

    return;

  }


  // ----------------------------------------------------------
  // Create switch.
  // ----------------------------------------------------------

  const switchContainer =
    document.createElement(
      "div"
    );


  switchContainer.id =
    "matching-mode-switch";


  switchContainer.className =
    "matching-mode-switch";


  switchContainer.innerHTML = `

    <div class="matching-mode-label">
      MATCHING MODE
    </div>


    <div class="matching-mode-buttons">

      <button
        type="button"
        class="matching-mode-btn active"
        id="manual-matching-btn"
      >
        MANUAL MATCHING
      </button>


      <button
        type="button"
        class="matching-mode-btn"
        id="automatic-matching-btn"
      >
        AUTOMATIC MATCHING
      </button>

    </div>

  `;


  // ----------------------------------------------------------
  // Automatic panel.
  // ----------------------------------------------------------

  const automaticPanel =
    document.createElement(
      "div"
    );


  automaticPanel.id =
    "automatic-matching-root";


  automaticPanel.hidden =
    true;


  // ----------------------------------------------------------
  // Insert BEFORE existing manual grid.
  // ----------------------------------------------------------

  manualPanel.parentNode.insertBefore(
    switchContainer,
    manualPanel
  );


  manualPanel.parentNode.insertBefore(
    automaticPanel,
    manualPanel
  );


  // ----------------------------------------------------------
  // Buttons.
  // ----------------------------------------------------------

  const manualButton =
    document.getElementById(
      "manual-matching-btn"
    );


  const automaticButton =
    document.getElementById(
      "automatic-matching-btn"
    );


  function setMode(
    mode
  ) {

    const manual =
      mode ===
      "manual";


    manualButton.classList.toggle(
      "active",
      manual
    );


    automaticButton.classList.toggle(
      "active",
      !manual
    );


    manualPanel.hidden =
      !manual;


    automaticPanel.hidden =
      manual;


    if (!manual) {

      generatedResult =
        null;

      currentBatchId =
        null;

      renderInitialPanel();

    }

  }


  manualButton.onclick =
    () => {

      setMode(
        "manual"
      );

    };


  automaticButton.onclick =
    () => {

      setMode(
        "automatic"
      );

    };


  // ----------------------------------------------------------
  // Default = Manual
  // ----------------------------------------------------------

  setMode(
    "manual"
  );

}


// ============================================================
// PUBLIC RESET
// ============================================================

export function resetAutomaticMatching() {

  generatedResult =
    null;

  currentBatchId =
    null;


  const automaticPanel =
    getRoot();


  if (
    automaticPanel &&
    !automaticPanel.hidden
  ) {

    renderInitialPanel();

  }

}