from pathlib import Path
import json
import os
import secrets
from datetime import datetime
from urllib import error as urllib_error
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from flask import Flask, redirect, render_template_string, send_from_directory, jsonify, request, session
from flask_cors import CORS


BASE_DIR = Path(__file__).resolve().parent

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "canjia-dev-insecure-change-me"
CORS(app, supports_credentials=True)

NAVER_AUTH = "https://nid.naver.com/oauth2.0/authorize"
NAVER_TOKEN = "https://nid.naver.com/oauth2.0/token"
NAVER_PROFILE_URL = "https://openapi.naver.com/v1/nid/me"
_NAVER_CREDENTIALS_PATH = BASE_DIR / "naver_credentials.json"


def naver_client_credentials():
    cid = os.environ.get("NAVER_CLIENT_ID")
    secret = os.environ.get("NAVER_CLIENT_SECRET")
    if cid and secret:
        return cid.strip(), secret.strip()
    if _NAVER_CREDENTIALS_PATH.is_file():
        try:
            with open(_NAVER_CREDENTIALS_PATH, encoding="utf-8") as fh:
                data = json.load(fh)
            cid = str(data.get("client_id") or "").strip()
            secret = str(data.get("client_secret") or "").strip()
            if cid and secret:
                return cid, secret
        except (OSError, ValueError):
            pass
    return "", ""


def resolve_oauth_public_origin():
    explicit = os.environ.get("CANJIA_PUBLIC_ORIGIN", "").strip().rstrip("/")
    if explicit:
        return explicit.replace("127.0.0.1", "localhost")
    root = request.url_root.rstrip("/")
    root = root.replace("127.0.0.1", "localhost")
    return root


def naver_server_redirect_uri():
    ur = os.environ.get("NAVER_OAUTH_REDIRECT_URI")
    if ur and ur.strip():
        return ur.strip().rstrip("/")

    return f"{resolve_oauth_public_origin()}/api/auth/naver/callback"


_NAVER_DONE_HTML = """<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>CANJIA 네이버 로그인</title></head>
<body>
<script>
(function () {
  var profile = {{ profile | tojson }};
  var targetOrigin = {{ target_origin | tojson }};
  try {
    localStorage.setItem("canjia_naver_profile", JSON.stringify(profile));
  } catch (e) {}
  if (window.opener && !window.opener.closed) {
    var visited = new Set();
    var w = window;
    var payload = { type: "NAVER_LOGIN_SUCCESS", profile: profile };
    for (var i = 0; i < 10 && w; i++) {
      var p = w.opener;
      if (!p || p.closed || visited.has(p)) break;
      visited.add(p);
      try {
        p.postMessage(payload, targetOrigin === "*" ? "*" : targetOrigin);
      } catch (e3) {
        try { p.postMessage(payload, "*"); } catch (e4) { break; }
      }
      w = p;
    }
    window.close();
  } else {
    window.location.replace("/");
  }
})();
</script>
<noscript>네이버 로그인 처리가 완료되었습니다. <a href="/">처음으로</a></noscript>
</body></html>"""


def fetch_naver_token(code: str, oauth_state: str, redirect_uri: str, client_id: str, client_secret: str) -> dict:
    qs = urlencode({
        "grant_type": "authorization_code",
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "code": code,
        "state": oauth_state,
    })
    req = Request(f"{NAVER_TOKEN}?{qs}")
    try:
        with urlopen(req, timeout=25) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib_error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            return {"error_http": True, "status": exc.code, "body": json.loads(body)}
        except json.JSONDecodeError:
            return {"error_http": True, "status": exc.code, "body": body}


def fetch_naver_profile(access_token: str) -> dict:
    req = Request(NAVER_PROFILE_URL)
    req.add_header("Authorization", f"Bearer {access_token}")
    try:
        with urlopen(req, timeout=25) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib_error.HTTPError as exc:
        return {"resultcode": "http_error", "message": exc.read().decode("utf-8", errors="replace")}

# 저장소 파일 경로
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
DOCUMENTS_FILE = DATA_DIR / "documents.json"
PROFILES_FILE = DATA_DIR / "profiles.json"


def send_project_file(filename: str):
    return send_from_directory(BASE_DIR, filename)


def load_documents():
    """문서 데이터 로드"""
    if DOCUMENTS_FILE.exists():
        with open(DOCUMENTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_documents(documents):
    """문서 데이터 저장"""
    with open(DOCUMENTS_FILE, "w", encoding="utf-8") as f:
        json.dump(documents, f, ensure_ascii=False, indent=2)


def load_profiles():
    """사용자 프로필 데이터 로드"""
    if PROFILES_FILE.exists():
        with open(PROFILES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_profiles(profiles):
    """사용자 프로필 데이터 저장"""
    with open(PROFILES_FILE, "w", encoding="utf-8") as f:
        json.dump(profiles, f, ensure_ascii=False, indent=2)


def upsert_profile_record(data: dict):
    """네이버 OAuth 등 서버 플로에서 프로필 JSON 파일에 반영"""
    if not data or not data.get("email"):
        return None
    profiles = load_profiles()
    email = data["email"]
    profiles[email] = {
        "email": email,
        "name": data.get("name", ""),
        "nickname": data.get("nickname", ""),
        "profileImage": data.get("profileImage", ""),
        "interest": data.get("interest", ""),
        "joined": data.get("joined", datetime.now().isoformat()),
    }
    save_profiles(profiles)
    return profiles[email]


# 정적 파일 경로
@app.get("/")
def index():
    return send_project_file("index.html")


@app.get("/favicon.ico")
def favicon():
    favicon_path = BASE_DIR / "favicon.ico"
    if favicon_path.exists():
        return send_project_file("favicon.ico")
    return "", 204


@app.get("/naver-callback")
@app.get("/naver-callback.html")
def naver_callback():
    return send_project_file("naver-callback.html")


@app.get("/naver-start")
@app.get("/naver-start.html")
def naver_start():
    return send_project_file("naver-start.html")


@app.get("/styles.css")
def styles():
    return send_project_file("styles.css")


@app.get("/script.js")
def script():
    return send_project_file("script.js")


@app.get("/naver-config.js")
def naver_config():
    return send_project_file("naver-config.js")


@app.get("/naver-debug.html")
def naver_debug():
    return send_project_file("naver-debug.html")


@app.get("/api/auth/naver/available")
def naver_oauth_available():
    cid, sec = naver_client_credentials()
    return jsonify({"available": bool(cid and sec)})


@app.get("/api/auth/naver/start")
def naver_oauth_start():
    """브라우저(또는 팝업)가 이 주소로 들어오면 네이버 로그인으로 리다이렉트합니다."""
    client_id, client_secret = naver_client_credentials()
    if not client_id or not client_secret:
        hint = (
            "서버 기반 네이버 로그인을 쓰려면 프로젝트 루트에 <code>naver_credentials.json</code>을 두거나, "
            "환경 변수 <code>NAVER_CLIENT_ID</code> / <code>NAVER_CLIENT_SECRET</code>을 설정하세요. "
            '(예시 파일: <code>naver_credentials.example.json</code>)'
        )
        return (
            "<!DOCTYPE html><html lang=\"ko\"><meta charset=\"utf-8\"><title>CANJIA 설정</title><body>"
            f"<p>{hint}</p>"
            "<p>또한 네이버 개발자센터에 <strong>Callback URL</strong>로 "
            "<code>http://localhost:5000/api/auth/naver/callback</code> 를 추가로 등록해야 합니다.</p>"
            "</body></html>",
            503,
            {"Content-Type": "text/html; charset=utf-8"},
        )

    oauth_state = secrets.token_urlsafe(32)
    session["naver_oauth_state"] = oauth_state
    redirect_uri = naver_server_redirect_uri()
    auth_url = NAVER_AUTH + "?" + urlencode(
        {
            "response_type": "code",
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "state": oauth_state,
        }
    )
    return redirect(auth_url)


@app.get("/api/auth/naver/callback")
def naver_oauth_callback():
    if request.args.get("error"):
        return (
            "<!DOCTYPE html><html lang=\"ko\"><meta charset=\"utf-8\"><body>"
            "<p>네이버 로그인이 취소되었거나 오류가 있습니다. 창을 닫고 다시 시도해 주세요.</p>"
            "</body></html>",
            400,
            {"Content-Type": "text/html; charset=utf-8"},
        )

    code = request.args.get("code")
    oauth_state = request.args.get("state")
    if not code or not oauth_state or oauth_state != session.get("naver_oauth_state"):
        return (
            "<!DOCTYPE html><html lang=\"ko\"><meta charset=\"utf-8\"><body>"
            "<p>로그인 상태가 맞지 않습니다(세션 만료 또는 서버 재시작). 메인 페이지에서 다시 시도해 주세요.</p>"
            "</body></html>",
            400,
            {"Content-Type": "text/html; charset=utf-8"},
        )

    session.pop("naver_oauth_state", None)

    client_id, client_secret = naver_client_credentials()
    redirect_uri = naver_server_redirect_uri()

    token_json = fetch_naver_token(code, oauth_state, redirect_uri, client_id, client_secret)
    if token_json.get("error_http") or not token_json.get("access_token"):
        return jsonify({"error": "네이버에서 토큰을 받지 못했습니다.", "detail": token_json}), 502

    me = fetch_naver_profile(token_json["access_token"])
    if me.get("resultcode") != "00":
        return jsonify({"error": "프로필 조회 실패", "detail": me}), 502

    rsp = me.get("response") or {}
    nid = rsp.get("id")
    nid_str = str(nid) if nid is not None else ""
    email = (rsp.get("email") or "").strip()
    if not email:
        email = f"naver_{nid_str}@canjia.local" if nid_str else f"naver_guest_{secrets.token_hex(6)}@canjia.local"

    profile = {
        "provider": "naver",
        "email": email,
        "nickname": rsp.get("nickname") or "",
        "name": rsp.get("name") or "",
        "profileImage": rsp.get("profile_image") or "",
    }

    try:
        upsert_profile_record(
            {
                "email": profile["email"],
                "name": profile["name"],
                "nickname": profile["nickname"],
                "profileImage": profile["profileImage"],
                "interest": "",
                "joined": datetime.now().isoformat(),
            }
        )
    except (OSError, TypeError):
        pass

    origin_hint = resolve_oauth_public_origin()
    return render_template_string(
        _NAVER_DONE_HTML,
        profile=profile,
        target_origin=origin_hint if request.url_root.startswith("http") else "*",
    )


# Google and Microsoft OAuth routes removed: app now supports Naver-only auth.

@app.get("/test-naver-config.html")
def test_naver_config():
    return send_project_file("test-naver-config.html")


@app.get("/api/documents")
def get_documents():
    """모든 문서 조회"""
    documents = load_documents()
    field = request.args.get("field")
    
    if field:
        documents = [doc for doc in documents if doc.get("field") == field]
    
    return jsonify(documents)


@app.post("/api/documents")
def create_document():
    """새 문서 생성"""
    data = request.get_json()
    
    if not data or not data.get("title"):
        return jsonify({"error": "제목은 필수입니다"}), 400
    
    documents = load_documents()
    
    new_doc = {
        "id": data.get("id") or f"doc-{int(datetime.now().timestamp() * 1000)}",
        "field": data.get("field", "agi"),
        "author": data.get("author", "작성자"),
        "title": data.get("title"),
        "summary": data.get("summary", ""),
        "body": data.get("body", ""),
        "date": data.get("date", datetime.now().isoformat()[:10])
    }
    
    # 기존 문서가 있으면 업데이트, 없으면 추가
    existing_index = next((i for i, doc in enumerate(documents) if doc["id"] == new_doc["id"]), None)
    if existing_index is not None:
        documents[existing_index] = new_doc
    else:
        documents.insert(0, new_doc)
    
    save_documents(documents)
    return jsonify(new_doc), 201


@app.get("/api/documents/<doc_id>")
def get_document(doc_id):
    """특정 문서 조회"""
    documents = load_documents()
    doc = next((doc for doc in documents if doc["id"] == doc_id), None)
    
    if not doc:
        return jsonify({"error": "문서를 찾을 수 없습니다"}), 404
    
    return jsonify(doc)


@app.delete("/api/documents/<doc_id>")
def delete_document(doc_id):
    """문서 삭제"""
    documents = load_documents()
    documents = [doc for doc in documents if doc["id"] != doc_id]
    save_documents(documents)
    
    return jsonify({"message": "문서가 삭제되었습니다"}), 200


@app.post("/api/profiles")
def save_profile():
    """사용자 프로필 저장"""
    data = request.get_json()

    if not data or not data.get("email"):
        return jsonify({"error": "이메일은 필수입니다"}), 400

    email = data.get("email")

    stored = upsert_profile_record(
        {
            "email": email,
            "name": data.get("name", ""),
            "nickname": data.get("nickname", ""),
            "profileImage": data.get("profileImage", ""),
            "interest": data.get("interest", ""),
            "joined": data.get("joined", datetime.now().isoformat()),
        }
    )
    return jsonify(stored), 201


@app.get("/api/profiles")
def get_profiles():
    """모든 사용자 프로필 조회"""
    profiles = load_profiles()
    return jsonify(list(profiles.values()))


@app.get("/api/profiles/<email>")
def get_profile(email):
    """특정 사용자 프로필 조회"""
    profiles = load_profiles()
    
    if email not in profiles:
        return jsonify({"error": "프로필을 찾을 수 없습니다"}), 404
    
    return jsonify(profiles[email])


if __name__ == "__main__":
    app.run(debug=True)
