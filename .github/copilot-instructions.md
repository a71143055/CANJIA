# CANJIA AI Coding Instructions

- This is a small Flask-backed static web app with Naver OAuth login and JSON file persistence.
- `app.py` is the only Python backend. It serves static files and exposes API endpoints via explicit `@app.get` / `@app.post` routes (no generic static folder).

## Key files

- `app.py` — Flask app, routes for pages, `/api/documents`, `/api/profiles`, JSON persistence under `data/`.
- `index.html` — main UI shell and entry point.
- `script.js` — field selection, document CRUD, profile save, Naver login (`postMessage` + `localStorage`).
- `naver-config.js` / `naver-start.html` / `naver-callback.html` / `naver-debug.html` — Naver implicit login SDK (`naverLogin_implicit-1.0.3.js`).
  - **`naver-start.html`** initializes the SDK (`init_naver_id_login`, `setPopup`, etc.) — do not reuse `naver-callback.html` for the first OAuth step.

## Architecture and behavior

- **Naver flow** (official two-page JS pattern): `naver-start.html` starts OAuth; after redirect, `naver-callback.html` reads the token/user profile and notifies the opener chain via `postMessage` `{ type: "NAVER_LOGIN_SUCCESS", profile }`. The main window handler in `script.js` mirrors the profile into `localStorage` under `canjia_naver_profile`.
- Legacy Google/Microsoft HTML may still exist; the main entry point targets Naver-only auth.
- Backend storage is JSON under `data/` (`documents.json`, `profiles.json`). `POST /api/documents` is idempotent on `id` (update vs insert).

## Useful workflows

- Install: `pip install -r requirements.txt`
- Run: `python app.py` → `http://localhost:5000`

## Patterns and constraints

- OAuth client IDs live in JS config placeholders (do not replace with real IDs in commits unless intended).
- Do not assume a database.
- Prefer keeping Naver OAuth split: starter page ≠ callback page.
