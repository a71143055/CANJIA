# CANJIA AI Coding Instructions

- This is a small Flask-backed static web app with OAuth login and JSON file persistence.
- `app.py` is the only Python backend. It serves static files and exposes all API endpoints.
- `script.js` is the main frontend logic. It uses `API_BASE` to switch between `http://localhost:5000` and `window.location.origin`.

## Key files

- `app.py` - Flask app, routes for pages, `/api/documents`, `/api/profiles`, and JSON persistence under `data/`.
- `index.html` - main UI shell and entry point for the app.
- `script.js` - field selection, document CRUD, profile save, and auth integration.
- `ms-config.js` / `naver-config.js` - manual OAuth client configuration files with placeholder IDs.
- `ms-callback.html` / `naver-callback.html` - OAuth callback pages that save profile data to localStorage and POST to `/api/profiles`.
- `ms-debug.html` / `naver-debug.html` - diagnostic pages for verifying OAuth setup.

## Architecture and behavior

- Authentication is client-side OAuth with two providers:
  - Microsoft via MSAL in `ms-callback.html` and `ms-debug.html`.
  - Naver via the Naver implicit login SDK in `naver-callback.html` and `naver-debug.html`.
- Backend storage is file-based JSON under `data/`. `app.py` creates `data/` automatically and reads/writes `documents.json` / `profiles.json`.
- Document creation is idempotent in `POST /api/documents`: if `id` exists, it updates the document; otherwise it inserts a new one.
- Frontend falls back to `defaultDocs` in `script.js` if `/api/documents` fails.

## Useful workflows

- Install dependencies: `pip install -r requirements.txt`
- Run locally: `python app.py`
- Open `http://localhost:5000` in the browser.
- Debug auth setup: `http://localhost:5000/ms-debug.html` and `http://localhost:5000/naver-debug.html`.

## Project-specific patterns

- Static assets are served explicitly by route handlers in `app.py`, not a Flask static folder.
- OAuth client IDs are stored in JS config files, not environment variables.
- The backend does not use a database; changes are persisted directly to JSON files.
- API path conventions are verb-based for documents and profiles:
  - `GET /api/documents`, `POST /api/documents`, `GET /api/documents/<doc_id>`, `DELETE /api/documents/<doc_id>`
  - `POST /api/profiles`, `GET /api/profiles`, `GET /api/profiles/<email>`

## What to avoid

- Do not assume a database exists; keep persistence layer as JSON files unless explicitly refactoring.
- Do not change auth flow without checking both callback pages and `script.js` behavior.
- Do not hardcode OAuth IDs in source control; preserve current placeholder pattern.
