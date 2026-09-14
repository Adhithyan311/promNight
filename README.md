# Película · Prom Night

Vintage-35mm film-festival themed matchmaking site. Static, no build step — open `index.html` in a browser, or serve the folder with any static server.

## Folder structure

```
index.html      → markup, all 5 views (routed by URL hash)
css/styles.css  → full design system (colors, type, components)
js/app.js       → hash router, form validation, director gate logic
```

## Routes

- `#/experience` — landing page (default)
- `#/register` — Audition Voucher signup form (name, dept, handle, affinity, + Romance/Friendship/Either intent)
- `#/status` — Status & Reveal match page
- `#/director-login` — protected Director authentication screen.
- `#/director-room` — protected admin Curation Suite. Requires an authenticated Director session.

## Director access

`js/app.js` holds the fixed Director verification profile for `#/director-login`. This is a **front-end demo only**: for production, move authentication and authorization to a real backend.

To reach it locally: go to `#/director-login` and enter all of these values —
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

- Match/participant data on `#/status` and `#/director-room` is static placeholder content — wire up a real data source before shipping.
- Fonts load from Google Fonts (Playfair Display + Inter) via CDN link in `index.html`.
