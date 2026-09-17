/**
 * Same Scene — Director Authentication
 *
 * Director authentication is handled by Supabase Auth.
 * Only users whose ID exists in public.directors can enter.
 */

let currentDirectorSession = null;
let authInitialized = false;


/**
 * Initialize Supabase authentication and restore
 * an existing Director session.
 */
export async function initializeDirectorAuth() {

  if (!window.supabaseClient) {
    console.error('Supabase client is unavailable.');

    currentDirectorSession = null;
    authInitialized = true;

    return null;
  }

  try {

    const { data, error } =
      await window.supabaseClient.auth.getSession();

    if (error) {
      console.error('Failed to restore Director session:', error);

      currentDirectorSession = null;

    } else {

      currentDirectorSession = data?.session || null;

    }

    /*
     * Keep our local session reference synchronized
     * with Supabase Auth.
     */
    window.supabaseClient.auth.onAuthStateChange(
      (_event, session) => {

        currentDirectorSession = session || null;

      }
    );

    authInitialized = true;

    return currentDirectorSession;

  } catch (error) {

    console.error(
      'Director authentication initialization failed:',
      error
    );

    currentDirectorSession = null;
    authInitialized = true;

    return null;
  }
}


/**
 * Check whether a Director is currently authenticated.
 */
export function isDirectorAuthenticated() {

  return Boolean(
    authInitialized &&
    currentDirectorSession &&
    currentDirectorSession.user
  );

}


/**
 * Login using Supabase email/password authentication.
 */
export async function authenticateDirector(email, password) {

  const cleanEmail =
    String(email || '').trim().toLowerCase();

  const cleanPassword =
    String(password || '');


  if (
    !cleanEmail ||
    !cleanEmail.includes('@') ||
    !cleanPassword
  ) {

    return {
      success: false,
      error: 'Please enter a valid email address and password.'
    };

  }


  if (!window.supabaseClient) {

    return {
      success: false,
      error: 'Authentication service is unavailable. Please try again.'
    };

  }


  try {

    /*
     * Step 1:
     * Authenticate the email/password through Supabase Auth.
     */
    const { data, error } =
      await window.supabaseClient.auth.signInWithPassword({

        email: cleanEmail,
        password: cleanPassword

      });


    if (error) {

      console.error('Supabase Director login failed:', error);

      return {
        success: false,
        error: 'Invalid email or password.'
      };

    }


    if (!data?.user || !data?.session) {

      return {
        success: false,
        error: 'Authentication failed. Please try again.'
      };

    }


    /*
     * Step 2:
     * Authentication alone is NOT enough.
     *
     * Check whether this Auth user exists in
     * public.directors.
     */
    const { data: director, error: directorError } =
      await window.supabaseClient
        .from('directors')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle();


    if (directorError) {

      console.error(
        'Director authorization check failed:',
        directorError
      );

      await window.supabaseClient.auth.signOut();

      return {
        success: false,
        error: 'Unable to verify Director authorization.'
      };

    }


    /*
     * Valid Supabase account, but not a Director.
     */
    if (!director) {

      await window.supabaseClient.auth.signOut();

      return {
        success: false,
        error: 'This account is not authorized as a Director.'
      };

    }


    /*
     * Everything is valid.
     */
    currentDirectorSession = data.session;

    return {

      success: true,
      user: data.user,
      session: data.session

    };

  } catch (error) {

    console.error(
      'Director authentication error:',
      error
    );

    return {
      success: false,
      error: 'Authentication failed. Please try again.'
    };

  }

}


/**
 * Logout Director.
 */
export async function logoutDirector() {

  if (!window.supabaseClient) {

    currentDirectorSession = null;
    authInitialized = true;

    return;

  }


  try {

    await window.supabaseClient.auth.signOut();

  } catch (error) {

    console.error(
      'Director logout failed:',
      error
    );

  }


  currentDirectorSession = null;

}


/**
 * Return the current Director session.
 */
export function getDirectorSession() {

  if (!isDirectorAuthenticated()) {

    return null;

  }

  return currentDirectorSession;

}