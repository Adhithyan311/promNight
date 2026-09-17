/**
 * Same Scene — Director Scenes
 *
 * Displays real matches from Supabase.
 *
 * Match lifecycle:
 *
 *     draft
 *       ↓
 * Director reviews
 *       ↓
 *    published
 *       ↓
 * Students can see their match
 */

import { isDirectorAuthenticated } from '../auth/directorAuth.js';


/**
 * Render all Director matches.
 */
export async function renderMatchesList() {

  const container =
    document.getElementById(
      "dir-matches-container"
    );

  if (!container) return;


  /*
   * Director authentication.
   */

  if (!isDirectorAuthenticated()) {

    location.replace(
      "#/director-login"
    );

    return;

  }


  /*
   * Supabase availability.
   */

  if (!window.supabaseClient) {

    container.innerHTML = `
      <div style="
        text-align:center;
        padding:32px;
        color:var(--muted);
        font-style:italic;
      ">
        Match service unavailable.
      </div>
    `;

    return;

  }


  /*
   * Loading state.
   */

  container.innerHTML = `
    <div style="
      text-align:center;
      padding:32px;
      color:var(--muted);
      font-style:italic;
    ">
      Loading scenes...
    </div>
  `;


  try {

    /*
     * Fetch matches.
     */
    const {
      data: matches,
      error: matchError
    } =
      await window.supabaseClient
        .from("matches")
        .select(`
          id,
          student_a_id,
          student_b_id,
          status,
          created_at,
          published_at
        `)
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (matchError) {

      console.error(
        "Failed to load matches:",
        matchError
      );

      container.innerHTML = `
        <div style="
          text-align:center;
          padding:32px;
          color:var(--muted);
          font-style:italic;
        ">
          Unable to load scenes.
        </div>
      `;

      return;

    }


    if (!matches || matches.length === 0) {

      container.innerHTML = `
        <div style="
          text-align:center;
          padding:32px;
          color:var(--muted);
          font-style:italic;
        ">
          No curated matches created yet.
          Select students in Matchmaking Studio
          to prepare a scene.
        </div>
      `;

      return;

    }


    /*
     * Collect all student IDs used by the matches.
     */

    const studentIds = [
      ...new Set(
        matches.flatMap(match => [
          match.student_a_id,
          match.student_b_id
        ])
      )
    ];


    /*
     * Fetch the corresponding students.
     */

    const {
      data: students,
      error: studentError
    } =
      await window.supabaseClient
        .from("students")
        .select(`
          id,
          name,
          department,
          semester,
          instagram_id,
          favourite_movie,
          gender,
          match_intent,
          status
        `)
        .in(
          "id",
          studentIds
        );


    if (studentError) {

      console.error(
        "Failed to load matched students:",
        studentError
      );

      container.innerHTML = `
        <div style="
          text-align:center;
          padding:32px;
          color:var(--muted);
          font-style:italic;
        ">
          Unable to load scene participants.
        </div>
      `;

      return;

    }


    /*
     * Create quick student lookup.
     */

    const studentMap =
      new Map(
        (students || []).map(
          student => [
            student.id,
            student
          ]
        )
      );


    /*
     * Render cards.
     */

    let html = "";


    matches.forEach(match => {

      const studentA =
        studentMap.get(
          match.student_a_id
        );

      const studentB =
        studentMap.get(
          match.student_b_id
        );


      if (!studentA || !studentB) {
        return;
      }


      const statusLabel =
        match.status === "published"
          ? "PUBLISHED"
          : "DRAFT";


      const statusClass =
        match.status === "published"
          ? "published"
          : "draft";


      const createdDate =
        formatDate(
          match.created_at
        );


      const publishedDate =
        match.published_at
          ? formatDate(
              match.published_at
            )
          : null;


      html += `
        <div class="match-card">

          <div class="pair">

            <div class="cand">

              <h4>
                ${escapeHtml(studentA.name)}
              </h4>

              <p>
                ${escapeHtml(studentA.department)}
                ·
                @${escapeHtml(
                  cleanInstagram(
                    studentA.instagram_id
                  )
                )}
              </p>

            </div>


            <div class="versus">
              ⟷
            </div>


            <div class="cand">

              <h4>
                ${escapeHtml(studentB.name)}
              </h4>

              <p>
                ${escapeHtml(studentB.department)}
                ·
                @${escapeHtml(
                  cleanInstagram(
                    studentB.instagram_id
                  )
                )}
              </p>

            </div>

          </div>


          <div>

            <div style="
              font-size:10px;
              color:var(--muted);
              margin-bottom:4px;
              text-align:right;
            ">
              Scene:
              #${escapeHtml(match.id)}
            </div>


            <div style="
              font-size:10px;
              color:var(--muted);
              margin-bottom:4px;
              text-align:right;
            ">
              Created:
              ${escapeHtml(createdDate)}
            </div>


            <div style="
              font-size:10px;
              margin-bottom:8px;
              text-align:right;
            ">
              <span class="scene-status ${statusClass}">
                ${statusLabel}
              </span>
            </div>


            ${
              match.status === "draft"
                ? `
                  <button
                    class="btn btn-outline btn-sm"
                    onclick="publishMatch('${match.id}')"
                  >
                    Publish Match
                  </button>

                  <button
                    class="btn btn-outline btn-sm"
                    style="
                      border-color:#9c3b3b;
                      color:#e88a8a;
                      margin-left:6px;
                    "
                    onclick="confirmUnmatch('${match.id}')"
                  >
                    Remove Draft
                  </button>
                `
                : `
                  <div style="
                    font-size:10px;
                    color:var(--muted);
                    text-align:right;
                  ">
                    Published
                    ${publishedDate
                      ? `· ${escapeHtml(publishedDate)}`
                      : ""}
                  </div>
                `
            }

          </div>

        </div>
      `;

    });


    if (!html) {

      container.innerHTML = `
        <div style="
          text-align:center;
          padding:32px;
          color:var(--muted);
          font-style:italic;
        ">
          No valid scenes found.
        </div>
      `;

      return;

    }


    container.innerHTML = html;


  } catch (error) {

    console.error(
      "Unexpected Scenes error:",
      error
    );

    container.innerHTML = `
      <div style="
        text-align:center;
        padding:32px;
        color:var(--muted);
        font-style:italic;
      ">
        Something went wrong while loading scenes.
      </div>
    `;

  }
}


/**
 * Publish a draft match.
 *
 * Publishing:
 *
 *     matches.status → published
 *     students.status → matched
 */
export async function publishMatch(
  matchId
) {

  if (!isDirectorAuthenticated()) {

    location.replace(
      "#/director-login"
    );

    return;

  }


  if (!window.supabaseClient) {

    showSceneMessage(
      "Match service is unavailable."
    );

    return;

  }


  const confirmed =
    confirm(
      "Publish this match? Both students will be able to see their match after publication."
    );


  if (!confirmed) {
    return;
  }


  try {

    /*
     * Fetch the draft first.
     */

    const {
      data: match,
      error: matchError
    } =
      await window.supabaseClient
        .from("matches")
        .select(`
          id,
          student_a_id,
          student_b_id,
          status
        `)
        .eq(
          "id",
          matchId
        )
        .maybeSingle();


    if (matchError) {

      console.error(
        "Failed to load match:",
        matchError
      );

      showSceneMessage(
        "Unable to verify this scene."
      );

      return;

    }


    if (!match) {

      showSceneMessage(
        "This scene no longer exists."
      );

      return;

    }


    if (match.status !== "draft") {

      showSceneMessage(
        "This scene has already been published."
      );

      return;

    }


    /*
     * Verify both students are still waiting.
     */

    const {
      data: students,
      error: studentError
    } =
      await window.supabaseClient
        .from("students")
        .select(
          "id, name, status"
        )
        .in(
          "id",
          [
            match.student_a_id,
            match.student_b_id
          ]
        );


    if (studentError) {

      console.error(
        "Failed to verify students:",
        studentError
      );

      showSceneMessage(
        "Unable to verify the students."
      );

      return;

    }


    const studentA =
      students?.find(
        student =>
          student.id ===
          match.student_a_id
      );

    const studentB =
      students?.find(
        student =>
          student.id ===
          match.student_b_id
      );


    if (!studentA || !studentB) {

      showSceneMessage(
        "One of the students could not be found."
      );

      return;

    }


    if (
      studentA.status !== "waiting" ||
      studentB.status !== "waiting"
    ) {

      showSceneMessage(
        "One or both students are no longer available for matching."
      );

      return;

    }


    /*
     * Publish the match.
     */

    const {
      error: publishError
    } =
      await window.supabaseClient
        .from("matches")
        .update({
          status: "published",
          published_at:
            new Date().toISOString()
        })
        .eq(
          "id",
          match.id
        )
        .eq(
          "status",
          "draft"
        );


    if (publishError) {

      console.error(
        "Failed to publish match:",
        publishError
      );

      showSceneMessage(
        "Unable to publish this match."
      );

      return;

    }


    /*
     * Mark both students as matched.
     */

    const {
      error: studentUpdateError
    } =
      await window.supabaseClient
        .from("students")
        .update({
          status: "matched"
        })
        .in(
          "id",
          [
            match.student_a_id,
            match.student_b_id
          ]
        )
        .eq(
          "status",
          "waiting"
        );


    if (studentUpdateError) {

      console.error(
        "Failed to update student status:",
        studentUpdateError
      );

      /*
       * Important:
       * The match itself is already published.
       *
       * This is why the final production version
       * should eventually use a PostgreSQL RPC
       * transaction for publication.
       */

      showSceneMessage(
        "Match published, but student status update needs attention."
      );

      await renderMatchesList();

      return;

    }


    showSceneMessage(
      `✓ Match published: ${studentA.name} ↔ ${studentB.name}`
    );


    /*
     * Refresh the Scenes list.
     */

    await renderMatchesList();


  } catch (error) {

    console.error(
      "Unexpected publish error:",
      error
    );

    showSceneMessage(
      "Something went wrong while publishing the match."
    );

  }

}


/**
 * Remove a DRAFT match.
 *
 * Published matches cannot be dissolved through the
 * Director UI because the project requirement is
 * one final match per student with no rematching.
 */
export async function handleUnmatch(
  matchId,
  renderDirectorLobbyFn
) {

  if (!isDirectorAuthenticated()) {

    location.replace(
      "#/director-login"
    );

    return;

  }


  if (!window.supabaseClient) {

    showSceneMessage(
      "Match service is unavailable."
    );

    return;

  }


  try {

    const {
      data: match,
      error
    } =
      await window.supabaseClient
        .from("matches")
        .select(
          "id, status"
        )
        .eq(
          "id",
          matchId
        )
        .maybeSingle();


    if (error) {

      console.error(
        "Failed to verify draft:",
        error
      );

      showSceneMessage(
        "Unable to verify this scene."
      );

      return;

    }


    if (!match) {

      showSceneMessage(
        "Scene not found."
      );

      return;

    }


    if (match.status !== "draft") {

      showSceneMessage(
        "Published matches cannot be dissolved."
      );

      return;

    }


    const {
      error: deleteError
    } =
      await window.supabaseClient
        .from("matches")
        .delete()
        .eq(
          "id",
          matchId
        )
        .eq(
          "status",
          "draft"
        );


    if (deleteError) {

      console.error(
        "Failed to remove draft:",
        deleteError
      );

      showSceneMessage(
        "Unable to remove this draft."
      );

      return;

    }


    if (
      typeof renderDirectorLobbyFn ===
      "function"
    ) {

      await renderDirectorLobbyFn();

    } else if (
      typeof window.renderDirectorLobby ===
      "function"
    ) {

      await window.renderDirectorLobby();

    }

  } catch (error) {

    console.error(
      "Unexpected draft removal error:",
      error
    );

    showSceneMessage(
      "Something went wrong."
    );

  }

}


/**
 * Confirmation for removing a DRAFT.
 */
export function confirmUnmatch(
  matchId,
  renderDirectorLobbyFn
) {

  const confirmed =
    confirm(
      "Remove this draft scene? Both students will remain available for another Director selection."
    );


  if (!confirmed) {
    return;
  }


  handleUnmatch(
    matchId,
    renderDirectorLobbyFn
  );

}


/**
 * Show a temporary message.
 */
function showSceneMessage(message) {

  const msgEl =
    document.getElementById(
      "match-msg"
    );

  if (!msgEl) return;

  msgEl.style.display =
    "block";

  msgEl.textContent =
    message;

  clearTimeout(
    window.sameSceneSceneMessageTimer
  );

  window.sameSceneSceneMessageTimer =
    setTimeout(() => {

      msgEl.style.display =
        "none";

    }, 4000);

}


/**
 * Clean Instagram handle.
 */
function cleanInstagram(value) {

  return String(value || "")
    .trim()
    .replace(/^@/, "");

}


/**
 * Escape HTML.
 */
function escapeHtml(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/**
 * Format timestamp.
 */
function formatDate(value) {

  if (!value) return "—";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "—";

  }

  return date.toLocaleDateString();

}


/*
 * Global bindings required by the existing
 * inline HTML onclick handlers.
 */
window.publishMatch =
  publishMatch;

window.confirmUnmatch =
  confirmUnmatch;