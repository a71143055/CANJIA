# CANJIA AI Coding Instructions

- This is a small Flask-backed static web app with OAuth login and JSON file persistence.
- `app.py` is the only Python backend. It serves static files and exposes all API endpoints.
- `script.js` is the main frontend logic. It uses `API_BASE` to switch between `http://localhost:5000` and `window.location.origin`.

## Key files

- `app.py` - Flask app, routes for pages, `/api/documents`, `/api/profiles`, and JSON persistence under `data/`.
- `index.html` - main UI shell and entry point for the app.
- `script.js` - field selection, document CRUD, profile save, and auth integration.
- `ms-config.js` / `ms-callback.html` / `ms-debug.html` - Microsoft OAuth via MSAL.
- `google-config.js` / `google-callback.html` / `google-debug.html` - Google OAuth via Google Identity Services.
- `naver-config.js` / `naver-callback.html` / `naver-debug.html` - Naver OAuth.

## Architecture and behavior

- Authentication is client-side OAuth with three providers:
  - Microsoft via MSAL in `ms-callback.html` and `ms-debug.html`.
  - Google via Google Identity Services in `google-callback.html` and `google-debug.html`.
  - Naver via implicit login SDK in `naver-callback.html` and `naver-debug.html`.
- Backend storage is file-based JSON under `data/`. `app.py` creates `data/` automatically and reads/writes `documents.json` / `profiles.json`.
- Document creation is idempotent in `POST /api/documents`: if `id` exists, it updates; otherwise it inserts.
- Frontend falls back to `defaultDocs` in `script.js` if `/api/documents` fails.

## Useful workflows

- Install dependencies: `pip install -r requirements.txt`
  - Requires Python 3.9+ and uses constrained versions for Flask 3.x, Flask-Cors 4.x, Werkzeug 3.x.
- Run locally: `python app.py`
- Open `http://localhost:5000` in the browser.
- Debug auth setup: `http://localhost:5000/ms-debug.html`, `http://localhost:5000/google-debug.html`, `http://localhost:5000/naver-debug.html`.

## Project-specific patterns

- Static assets are served explicitly by route handlers in `app.py`, not a Flask static folder.
- OAuth client IDs are stored in JS config files (`*-config.js`), not environment variables.
- The backend does not use a database; changes are persisted directly to JSON files.
- API path conventions are verb-based for documents and profiles:
  - `GET /api/documents`, `POST /api/documents`, `GET /api/documents/<doc_id>`, `DELETE /api/documents/<doc_id>`
  - `POST /api/profiles`, `GET /api/profiles`, `GET /api/profiles/<email>`
- Auth callback pages communicate back to main window via `window.postMessage()` with `type: "PROVIDER_LOGIN_SUCCESS"`.

## What to avoid

- Do not assume a database exists; keep persistence layer as JSON files unless explicitly refactoring.
- Do not change auth flow without checking all three callback pages and `script.js` behavior.
- Do not hardcode OAuth IDs in source control; preserve current placeholder pattern.
- Do not modify the `data/` directory structure without updating load/save functions in `app.py`.
