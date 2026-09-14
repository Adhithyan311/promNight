(function () {
  const defaultUrl = 'https://pxrhmuxwewipclztyaby.supabase.co';
  const defaultKey = 'sb_publishable_kYMQ1Mp2zKiirSeKbP-Nvw_ARYcla0l';

  const config = {
    url: window.SUPABASE_URL || defaultUrl,
    publishableKey: window.SUPABASE_PUBLISHABLE_KEY || defaultKey
  };

  if (!window.supabase && window.supabaseCreateClient) {
    window.supabase = window.supabaseCreateClient(config.url, config.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    });
  }

  if (!window.supabase && window.supabase && typeof window.supabase.createClient === 'function') {
    window.supabase = window.supabase.createClient(config.url, config.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    });
  }

  if (!window.supabase && typeof window.supabaseCreateClient !== 'undefined') {
    window.supabase = window.supabaseCreateClient(config.url, config.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    });
  }

  if (!window.supabase) {
    console.warn('Supabase client is unavailable. The site will continue with placeholder behavior until the CDN script loads.');
  }
})();
