# Película · Prom Night

Vintage-35mm film-festival themed matchmaking site. Static, no build step — open `index.html` in a browser, or serve the folder with any static server.

## Folder structure

```
index.html      → markup, all 5 views (routed by URL hash)
css/styles.css  → full design system (colors, type, components)
js/app.js       → hash router, form validation, director gate logic
js/supabase.js  → Supabase client scaffold for backend integration
supabase/schema.sql → database schema for participants and matches
```

## Routes

- `#/experience` — landing page (default)
- `#/register` — Audition Voucher signup form
- `#/status` — Status & Reveal match page
- `#/director-login` — protected Director authentication screen
- `#/director-room` — protected admin Curation Suite

## Director access

`js/app.js` holds the fixed Director verification profile for `#/director-login`. This is a front-end demo only: for production, move authentication and authorization to a real backend.

To reach it locally: go to `#/director-login` and enter all of these values:

```
Name:          Akhila
Branch:        CSE
Semester:      S7
Instagram:     RYUK
Favorite Movie: Bangalore Days
Favorite Genre: Romance
Favorite Music: Malare
Gender:        Female
```

## Notes

- The app can be served as a static site or connected to Supabase for persistent data.
- Fonts load from Google Fonts (Playfair Display + Inter) via CDN in `index.html`.
- This repo includes validation scripts for director registration and matching flow checks.

