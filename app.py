from pathlib import Path
import json
import os
from datetime import datetime
from flask import Flask, send_from_directory, jsonify, request, session
from flask_cors import CORS
import requests
import pyotp
import qrcode
import io
import base64
from passlib.hash import bcrypt

BASE_DIR = Path(__file__).resolve().parent

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "canjia-dev-insecure-change-me"
CORS(app, supports_credentials=True)

# 저장소 파일 경로
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
DOCUMENTS_FILE = DATA_DIR / "documents.json"
PROFILES_FILE  = DATA_DIR / "profiles.json"
USERS_FILE     = DATA_DIR / "users.json"


# ===== 데이터 로드 / 저장 =====

def load_json(path, default):
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return default

def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

load_documents  = lambda: load_json(DOCUMENTS_FILE, [])
save_documents  = lambda d: save_json(DOCUMENTS_FILE, d)
load_profiles   = lambda: load_json(PROFILES_FILE, [])
save_profiles   = lambda d: save_json(PROFILES_FILE, d)
load_users      = lambda: load_json(USERS_FILE, {})
save_users      = lambda d: save_json(USERS_FILE, d)


# ===== 인증 API =====  (정적 라우트보다 먼저 등록)

@app.post("/api/auth/register")
def register_user():
    data = request.get_json(force=True, silent=True)
    if not data or "username" not in data or "password" not in data:
        return jsonify({"error": "username과 password가 필요합니다"}), 400

    username = data["username"].strip()
    password = data["password"].strip()

    if not username or not password:
        return jsonify({"error": "username과 password를 입력해주세요"}), 400
    if len(password) < 6:
        return jsonify({"error": "비밀번호는 최소 6자 이상이어야 합니다"}), 400

    users = load_users()
    if username in users:
        return jsonify({"error": "이미 등록된 사용자입니다"}), 400

    hashed = bcrypt.hash(password)
    secret = pyotp.random_base32()

    totp = pyotp.TOTP(secret)
    uri  = totp.provisioning_uri(name=username, issuer_name="CANJIA")

    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    qr_b64 = base64.b64encode(buf.getvalue()).decode()

    users[username] = {
        "password":   hashed,
        "secret":     secret,
        "created_at": datetime.now().isoformat(),
    }
    save_users(users)

    return jsonify({
        "success":  True,
        "username": username,
        "secret":   secret,
        "qr_code":  f"data:image/png;base64,{qr_b64}",
    }), 200


@app.post("/api/auth/login")
def login_user():
    data = request.get_json(force=True, silent=True)
    if not data or "username" not in data or "password" not in data:
        return jsonify({"error": "username과 password가 필요합니다"}), 400

    username = data["username"].strip()
    password = data["password"].strip()

    if not username or not password:
        return jsonify({"error": "username과 password를 입력해주세요"}), 400

    users = load_users()
    if username not in users:
        return jsonify({"error": "등록되지 않은 사용자입니다"}), 400

    user_rec = users[username]

    if "password" not in user_rec:
        return jsonify({
            "error": "이 계정은 비밀번호가 설정되지 않았습니다. 새 계정을 등록해주세요."
        }), 400

    if not bcrypt.verify(password, user_rec["password"]):
        return jsonify({"error": "비밀번호가 올바르지 않습니다"}), 400

    session["login_username"] = username
    return jsonify({
        "success":  True,
        "username": username,
        "message":  "1단계 로그인 성공 - 2단계 인증 필요",
    }), 200


@app.post("/api/auth/verify-2fa")
def verify_2fa():
    data = request.get_json(force=True, silent=True)
    if not data or "code" not in data:
        return jsonify({"error": "TOTP 코드가 필요합니다"}), 400

    code = data["code"].strip()
    if not code:
        return jsonify({"error": "TOTP 코드를 입력해주세요"}), 400

    if "login_username" not in session:
        return jsonify({"error": "먼저 1단계 로그인을 완료해주세요"}), 400

    username = session["login_username"]
    users    = load_users()

    if username not in users:
        return jsonify({"error": "사용자를 찾을 수 없습니다"}), 400

    secret = users[username]["secret"]
    totp   = pyotp.TOTP(secret)

    if totp.verify(code, valid_window=1):
        session["authenticated"] = True
        session["username"]      = username
        session.pop("login_username", None)

        return jsonify({
            "success":  True,
            "username": username,
            "message":  "로그인 성공",
        }), 200
    else:
        return jsonify({"success": False, "error": "인증 코드가 올바르지 않습니다"}), 400


@app.post("/api/auth/logout")
def logout_user():
    session.clear()
    return jsonify({"success": True}), 200


# ===== 문서 API =====

@app.get("/api/documents")
def get_documents():
    return jsonify(load_documents()), 200

@app.post("/api/documents")
def create_document():
    data = request.get_json(force=True, silent=True)
    if not data or "title" not in data or "user_id" not in data:
        return jsonify({"error": "title과 user_id는 필수입니다"}), 400

    documents = load_documents()
    doc_id    = data.get("id") or datetime.now().isoformat()
    existing  = next((d for d in documents if d.get("id") == doc_id), None)

    if existing:
        existing.update(data)
        existing["updated_at"] = datetime.now().isoformat()
    else:
        documents.append({
            "id":         doc_id,
            "title":      data["title"],
            "field":      data.get("field", ""),
            "user_id":    data["user_id"],
            "created_at": data.get("created_at", datetime.now().isoformat()),
            "updated_at": datetime.now().isoformat(),
        })

    save_documents(documents)
    return jsonify({"success": True, "id": doc_id}), 200

@app.delete("/api/documents")
def delete_document():
    doc_id = request.args.get("id")
    if not doc_id:
        return jsonify({"error": "id 파라미터가 필요합니다"}), 400

    documents = [d for d in load_documents() if d.get("id") != doc_id]
    save_documents(documents)
    return jsonify({"success": True}), 200


# ===== 프로필 API =====

@app.get("/api/profiles")
def get_profiles():
    return jsonify(load_profiles()), 200

@app.post("/api/profiles")
def create_profile():
    data = request.get_json(force=True, silent=True)
    if not data or "user_id" not in data:
        return jsonify({"error": "user_id는 필수입니다"}), 400

    profiles   = load_profiles()
    profile_id = data.get("id") or datetime.now().isoformat()
    existing   = next((p for p in profiles if p.get("id") == profile_id), None)

    if existing:
        existing.update(data)
        existing["updated_at"] = datetime.now().isoformat()
    else:
        profiles.append({
            "id":         profile_id,
            "interests":  data.get("interests", ""),
            "plan":       data.get("plan", ""),
            "user_id":    data["user_id"],
            "created_at": data.get("created_at", datetime.now().isoformat()),
            "updated_at": datetime.now().isoformat(),
        })

    save_profiles(profiles)
    return jsonify({"success": True, "id": profile_id}), 200

@app.delete("/api/profiles")
def delete_profile():
    profile_id = request.args.get("id")
    if not profile_id:
        return jsonify({"error": "id 파라미터가 필요합니다"}), 400

    profiles = [p for p in load_profiles() if p.get("id") != profile_id]
    save_profiles(profiles)
    return jsonify({"success": True}), 200


# ===== 정적 파일 =====  (API 라우트보다 나중에 등록)

@app.get("/")
def serve_index():
    return send_from_directory(BASE_DIR, "index.html")

STATIC_FILES = {
    "index.html", "script.js", "styles.css", "favicon.ico",
    "naver-callback.html", "naver-config.js", "naver-start.html",
}

@app.get("/<filename>")
def serve_static(filename):
    if filename in STATIC_FILES:
        return send_from_directory(BASE_DIR, filename)
    return jsonify({"error": "Not found"}), 404


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
