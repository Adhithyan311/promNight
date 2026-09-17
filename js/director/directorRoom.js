import { Storage } from '../storage/storage.js';

import { updateDashboardStats } from './dashboard.js';

import {
  populateCandidatePickers,
  updateStudioCards
} from './matchStudio.js';

import { renderDirectoryList } from './cast.js';
import { renderMatchesList } from './scenes.js';

import { updateNavState } from '../ui/components.js';
import { logoutDirector } from '../auth/directorAuth.js';


export let currentDirectoryFilter = 'all';


/* =========================================================
   SUPABASE DIRECTOR DATA
========================================================= */

let directorStudents = [];


/* =========================================================
   LOAD STUDENTS FROM SUPABASE
========================================================= */
let directorStudentsChannel = null;
export function subscribeToDirectorStudentChanges() {

  if (!window.supabaseClient) {
    console.error("Supabase client is unavailable.");
    return;
  }

  // Prevent duplicate subscriptions
  if (directorStudentsChannel) {
    window.supabaseClient.removeChannel(
      directorStudentsChannel
    );

    directorStudentsChannel = null;
  }

  directorStudentsChannel =
    window.supabaseClient
      .channel("same-scene-director-students")

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "students"
        },
        async payload => {

          console.log(
            "Director student update received:",
            payload.eventType
          );

          /*
           * Reload the latest student records.
           */
          const students =
            await loadDirectorStudents();

          /*
           * Update the matchmaking dropdowns.
           */
          populateCandidatePickers(
            students
          );

          /*
           * Refresh the selected student cards.
           */
          updateStudioCards();

          /*
           * Refresh dashboard numbers.
           */
          updateDashboardStats();

          /*
           * Refresh directory.
           */
          renderDirectoryList(
            currentDirectoryFilter
          );

          /*
           * Refresh matches.
           */
          renderMatchesList();
        }
      )

      .subscribe(status => {

        console.log(
          "Director student realtime:",
          status
        );

      });
}
export async function loadDirectorStudents() {

  if (!window.supabaseClient) {

    console.error(
      'Supabase client is unavailable.'
    );

    return [];

  }


  try {

    const {
      data,
      error
    } =
      await window.supabaseClient
        .from('students')
        .select(`
          id,
          access_code,
          name,
          department,
          semester,
          instagram_id,
          favourite_movie,
          gender,
          match_intent,
          status,
          created_at,
          updated_at
        `)
        .order(
          'created_at',
          {
            ascending: false
          }
        );


    if (error) {

      console.error(
        'Failed to load Director students:',
        error
      );

      return [];

    }


    directorStudents =
      Array.isArray(data)
        ? data
        : [];


    /*
     * Compatibility layer for the existing
     * Directory / legacy Director UI.
     */

    const compatibilityCandidates =
      directorStudents.map(student => ({

        id:
          student.id,

        name:
          student.name,

        department:
          student.department,

        branch:
          student.department,

        semester:
          student.semester,

        instagram_id:
          student.instagram_id,

        instagram:
          student.instagram_id,

        handle:
          student.instagram_id,

        favoriteMovie:
          student.favourite_movie,

        favourite_movie:
          student.favourite_movie,

        gender:
          student.gender,

        matchIntent:
          student.match_intent,

        match_intent:
          student.match_intent,

        status:
          student.status === 'matched'
            ? 'MATCHED'
            : 'IN REVIEW',

        role:
          'candidate',

        created_at:
          student.created_at,

        updated_at:
          student.updated_at

      }));


    /*
     * Keep existing Directory UI working.
     */

    Storage.saveCandidates(
      compatibilityCandidates
    );


    return directorStudents;


  } catch (error) {

    console.error(
      'Unexpected Director student loading error:',
      error
    );

    return [];

  }
}


/* =========================================================
   GET ALL LOADED STUDENTS
========================================================= */

export function getDirectorStudents() {

  return directorStudents;

}


/* =========================================================
   GET ONLY STUDENTS ELIGIBLE FOR A NEW MATCH
========================================================= */

export function getAvailableMatchStudents() {

  return directorStudents.filter(
    student => {

      const status =
        String(
          student?.status || ''
        )
          .trim()
          .toLowerCase();

      return status === 'waiting';

    }
  );

}


/* =========================================================
   FILTER HANDLING
========================================================= */

export function setFilter(filter) {

  currentDirectoryFilter =
    filter;


  document
    .querySelectorAll(
      '.filter-chip'
    )
    .forEach(chip => {

      chip.classList.toggle(
        'active',
        chip.id === `filter-${filter}`
      );

    });


  renderDirectoryList(
    currentDirectoryFilter
  );

}


/* =========================================================
   RENDER DIRECTOR ROOM
========================================================= */

export async function renderDirectorLobby() {

  /*
   * Verify Director authentication.
   */

  const {
    isDirectorAuthenticated
  } =
    await import(
      '../auth/directorAuth.js'
    );


  if (
    !isDirectorAuthenticated()
  ) {

    location.replace(
      '#/director-login'
    );

    return;

  }


  /*
   * Always reload directly from Supabase.
   *
   * This is important after a match is published.
   */

  const students =
    await loadDirectorStudents();

    subscribeToDirectorStudentChanges();
  /*
   * ONLY waiting students are passed
   * into Match Studio.
   *
   * Matched students remain available
   * for Directory and statistics,
   * but cannot be selected again.
   */

  const availableStudents =
    students.filter(
      student => {

        const status =
          String(
            student?.status || ''
          )
            .trim()
            .toLowerCase();

        return status === 'waiting';

      }
    );


  /*
   * Match Studio gets ONLY waiting students.
   *
   * matchStudio.js will then divide them:
   *
   * Candidate A → Male
   * Candidate B → Female
   */

  populateCandidatePickers(
    availableStudents
  );


  /*
   * Update cards after picker population.
   */

  updateStudioCards();


  /*
   * Dashboard still receives ALL students
   * so Registered / Matched statistics remain
   * accurate.
   */

  updateDashboardStats();


  /*
   * Directory still receives ALL students.
   */

  renderDirectoryList(
    currentDirectoryFilter
  );


  /*
   * Match list still receives all matches.
   */

  renderMatchesList();

}


/* =========================================================
   REFRESH DIRECTOR DATA
========================================================= */

/*
 * Use this after creating/publishing/removing
 * a match when the Director UI needs to reflect
 * the newest Supabase state immediately.
 */

export async function refreshDirectorRoom() {

  await renderDirectorLobby();

}


/* =========================================================
   DIRECTOR TABS
========================================================= */

export function switchDirectorTab(
  tabName
) {

  document
    .querySelectorAll(
      '.dr-tab'
    )
    .forEach(tab => {

      tab.classList.toggle(
        'active',
        tab.dataset.tab === tabName
      );

    });


  document
    .querySelectorAll(
      '.dr-sidebar-link'
    )
    .forEach(link => {

      link.classList.toggle(
        'active',
        link.dataset.tab === tabName
      );

    });


  const studioContent =
    document.getElementById(
      'dr-tab-content-studio'
    );


  const dirContent =
    document.getElementById(
      'dr-tab-content-directory'
    );


  const matchesContent =
    document.getElementById(
      'dr-tab-content-matches'
    );


  if (studioContent) {

    studioContent.classList.toggle(
      'hidden',
      tabName !== 'studio'
    );

  }


  if (dirContent) {

    dirContent.classList.toggle(
      'hidden',
      tabName !== 'directory'
    );

  }


  if (matchesContent) {

    matchesContent.classList.toggle(
      'hidden',
      tabName !== 'matches'
    );

  }


  if (
    tabName === 'directory'
  ) {

    renderDirectoryList(
      currentDirectoryFilter
    );

  }


  if (
    tabName === 'matches'
  ) {

    renderMatchesList();

  }

}


/* =========================================================
   INITIALISE DIRECTOR TABS
========================================================= */

export function initDirectorTabs() {

  const tabs =
    document.querySelectorAll(
      '.dr-tab, .dr-sidebar-link[data-tab]'
    );


  tabs.forEach(tab => {

    tab.addEventListener(
      'click',
      event => {

        event.preventDefault();


        const tabName =
          tab.dataset.tab;


        if (tabName) {

          switchDirectorTab(
            tabName
          );

        }

      }
    );

  });


  /* -----------------------------------------
     FILTERS
  ----------------------------------------- */

  const filterAll =
    document.getElementById(
      'filter-all'
    );


  const filterPending =
    document.getElementById(
      'filter-pending'
    );


  const filterMatched =
    document.getElementById(
      'filter-matched'
    );


  if (filterAll) {

    filterAll.onclick = () => {

      setFilter(
        'all'
      );

    };

  }


  if (filterPending) {

    filterPending.onclick = () => {

      setFilter(
        'pending'
      );

    };

  }


  if (filterMatched) {

    filterMatched.onclick = () => {

      setFilter(
        'matched'
      );

    };

  }


  /* -----------------------------------------
     DIRECTORY SEARCH
  ----------------------------------------- */

  const searchInput =
    document.getElementById(
      'dir-search-input'
    );


  if (searchInput) {

    searchInput.oninput = () => {

      renderDirectoryList(
        currentDirectoryFilter
      );

    };

  }


  /* -----------------------------------------
     SECURE LOGOUT
  ----------------------------------------- */

  const logoutBtn =
    document.getElementById(
      'dr-logout-btn'
    );


  if (logoutBtn) {

    logoutBtn.onclick =
      async event => {

        event.preventDefault();


        await logoutDirector();


        updateNavState();


        location.hash =
          '#/director-login';

      };

  }

}