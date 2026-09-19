// ============================================================
// AUTOMATIC MATCHING ENGINE
// Película · Prom Night
// ============================================================
//
// RULES
// ------------------------------------------------------------
// 1. Only students with status = "waiting" are eligible.
// 2. Male can ONLY be paired with Female.
// 3. Female can ONLY be paired with Male.
// 4. Male + Male is NEVER allowed.
// 5. Female + Female is NEVER allowed.
// 6. Every student can appear in only ONE generated pair.
// 7. If genders are unbalanced, remaining students stay
//    unmatched.
// 8. Already matched students are ignored.
// 9. The Director can review generated pairs before drafts
//    are created.
// ============================================================


// ============================================================
// NORMALIZE GENDER
// ============================================================

function normalizeGender(value) {

  return String(value || "")
    .trim()
    .toLowerCase();

}


// ============================================================
// NORMALIZE TEXT
// ============================================================

function normalizeText(value) {

  return String(value || "")
    .trim()
    .toLowerCase();

}


// ============================================================
// IS MALE
// ============================================================

function isMale(student) {

  return normalizeGender(
    student?.gender
  ) === "male";

}


// ============================================================
// IS FEMALE
// ============================================================

function isFemale(student) {

  return normalizeGender(
    student?.gender
  ) === "female";

}


// ============================================================
// IS WAITING
// ============================================================

function isWaiting(student) {

  return normalizeText(
    student?.status
  ) === "waiting";

}


// ============================================================
// MATCHING SCORE
// ============================================================
//
// The gender rule is mandatory.
// The score is only used to decide which eligible
// Male/Female pair should be suggested first.
//
// Available fields in your database:
// - department
// - semester
// - favourite_movie
// - match_intent
//
// Higher score = more shared information.
//
// IMPORTANT:
// This is NOT an AI/compatibility score shown to students.
// It is only an internal ordering mechanism for the
// Director's automatic draft suggestions.
// ============================================================

function calculatePairScore(
  male,
  female
) {

  let score = 0;


  // Same match intent
  if (
    normalizeText(male.match_intent) &&
    normalizeText(male.match_intent) ===
    normalizeText(female.match_intent)
  ) {

    score += 4;

  }


  // Same semester
  if (
    normalizeText(male.semester) &&
    normalizeText(male.semester) ===
    normalizeText(female.semester)
  ) {

    score += 3;

  }


  // Same department
  if (
    normalizeText(male.department) &&
    normalizeText(male.department) ===
    normalizeText(female.department)
  ) {

    score += 2;

  }


  // Same favourite movie
  if (
    normalizeText(male.favourite_movie) &&
    normalizeText(male.favourite_movie) ===
    normalizeText(female.favourite_movie)
  ) {

    score += 5;

  }


  return score;

}


// ============================================================
// GET MATCHING BASIS
// ============================================================

export function getMatchingBasis(
  male,
  female
) {

  const basis = [];


  if (
    normalizeText(male.favourite_movie) &&
    normalizeText(male.favourite_movie) ===
    normalizeText(female.favourite_movie)
  ) {

    basis.push(
      "Same Favourite Movie"
    );

  }


  if (
    normalizeText(male.match_intent) &&
    normalizeText(male.match_intent) ===
    normalizeText(female.match_intent)
  ) {

    basis.push(
      "Same Match Intent"
    );

  }


  if (
    normalizeText(male.semester) &&
    normalizeText(male.semester) ===
    normalizeText(female.semester)
  ) {

    basis.push(
      "Same Semester"
    );

  }


  if (
    normalizeText(male.department) &&
    normalizeText(male.department) ===
    normalizeText(female.department)
  ) {

    basis.push(
      "Same Department"
    );

  }


  if (basis.length === 0) {

    basis.push(
      "Eligible Male ↔ Female Pair"
    );

  }


  return basis;

}


// ============================================================
// GENERATE AUTOMATIC MATCHES
// ============================================================

export function generateAutomaticMatches(
  students = []
) {

  if (!Array.isArray(students)) {

    return {
      males: [],
      females: [],
      pairs: [],
      unmatchedMales: [],
      unmatchedFemales: []
    };

  }


  // ----------------------------------------------------------
  // ONLY WAITING STUDENTS
  // ----------------------------------------------------------

  const waitingStudents =
    students.filter(
      student => isWaiting(student)
    );


  // ----------------------------------------------------------
  // SEPARATE BY GENDER
  // ----------------------------------------------------------

  const males =
    waitingStudents.filter(
      student => isMale(student)
    );

  const females =
    waitingStudents.filter(
      student => isFemale(student)
    );


  // ----------------------------------------------------------
  // CREATE ALL POSSIBLE MALE/FEMALE PAIRS
  // ----------------------------------------------------------

  const possiblePairs = [];


  males.forEach(
    male => {

      females.forEach(
        female => {

          possiblePairs.push({

            male,

            female,

            score:
              calculatePairScore(
                male,
                female
              )

          });

        }
      );

    }
  );


  // ----------------------------------------------------------
  // SORT BY SCORE
  // ----------------------------------------------------------
  //
  // Higher score gets considered first.
  //
  // created_at is used as a stable fallback so that
  // generation remains predictable.
  // ----------------------------------------------------------

  possiblePairs.sort(
    (a, b) => {

      if (b.score !== a.score) {

        return b.score - a.score;

      }


      const aTime =
        new Date(
          a.male?.created_at || 0
        ).getTime();

      const bTime =
        new Date(
          b.male?.created_at || 0
        ).getTime();

      return aTime - bTime;

    }
  );


  // ----------------------------------------------------------
  // SELECT ONE-TO-ONE PAIRS
  // ----------------------------------------------------------

  const usedMales =
    new Set();

  const usedFemales =
    new Set();

  const pairs = [];


  for (
    const candidate
    of possiblePairs
  ) {

    const maleId =
      candidate.male.id;

    const femaleId =
      candidate.female.id;


    // Already used
    if (
      usedMales.has(maleId) ||
      usedFemales.has(femaleId)
    ) {

      continue;

    }


    // Safety: never same student
    if (
      maleId === femaleId
    ) {

      continue;

    }


    // Safety: enforce gender again
    if (
      !isMale(candidate.male) ||
      !isFemale(candidate.female)
    ) {

      continue;

    }


    usedMales.add(
      maleId
    );

    usedFemales.add(
      femaleId
    );


    pairs.push({

      male:
        candidate.male,

      female:
        candidate.female,

      score:
        candidate.score

    });

  }


  // ----------------------------------------------------------
  // REMAINING STUDENTS
  // ----------------------------------------------------------

  const unmatchedMales =
    males.filter(
      student =>
        !usedMales.has(
          student.id
        )
    );


  const unmatchedFemales =
    females.filter(
      student =>
        !usedFemales.has(
          student.id
        )
    );


  // ----------------------------------------------------------
  // RESULT
  // ----------------------------------------------------------

  return {

    males,

    females,

    pairs,

    unmatchedMales,

    unmatchedFemales,

    totalWaiting:
      waitingStudents.length,

    totalPairs:
      pairs.length

  };

}