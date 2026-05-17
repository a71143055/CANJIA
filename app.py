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
PROFILES_FILE = DATA_DIR / "profiles.json"
USERS_FILE = DATA_DIR / "users.json"


# ===== 문서(Document) 관리 =====


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
    return []


def save_profiles(profiles):
    """사용자 프로필 데이터 저장"""
    with open(PROFILES_FILE, "w", encoding="utf-8") as f:
        json.dump(profiles, f, ensure_ascii=False, indent=2)


def load_users():
    """사용자 데이터 로드"""
    if USERS_FILE.exists():
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_users(users):
    """사용자 데이터 저장"""
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, ensure_ascii=False, indent=2)


# ===== API 라우트 =====

# 정적 파일 제공
@app.get("/")
def serve_index():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/<filename>")
def serve_static(filename):
    if filename in ["index.html", "script.js", "styles.css", "favicon.ico", "naver-callback.html", "naver-config.js"]:
        return send_from_directory(BASE_DIR, filename)
    return jsonify({"error": "Not found"}), 404


# ===== 문서 API =====


@app.get("/api/documents")
def get_documents():
    """모든 문서 조회"""
    return jsonify(load_documents()), 200


@app.post("/api/documents")
def create_document():
    """새 문서 생성"""
    data = request.get_json()
    
    if not data or "title" not in data or "user_id" not in data:
        return jsonify({"error": "title과 user_id는 필수입니다"}), 400
    
    documents = load_documents()
    
    # user_id가 있으면 update, 없으면 insert 
    doc_id = data.get("id") or datetime.now().isoformat()
    
    # 기존 문서 찾기
    existing = next((d for d in documents if d.get("id") == doc_id), None)
    
    if existing:
        # 업데이트
        existing.update(data)
        existing["updated_at"] = datetime.now().isoformat()
    else:
        # 새로 추가
        doc = {
            "id": doc_id,
            "title": data["title"],
            "field": data.get("field", ""),
            "user_id": data["user_id"],
            "created_at": data.get("created_at", datetime.now().isoformat()),
            "updated_at": datetime.now().isoformat()
        }
        documents.append(doc)
    
    save_documents(documents)
    return jsonify({"success": True, "id": doc_id}), 200


@app.delete("/api/documents")
def delete_document():
    """문서 삭제"""
    doc_id = request.args.get("id")
    
    if not doc_id:
        return jsonify({"error": "id 파라미터가 필요합니다"}), 400
    
    documents = load_documents()
    documents = [d for d in documents if d.get("id") != doc_id]
    
    save_documents(documents)
    return jsonify({"success": True}), 200


# ===== 프로필 API =====


@app.get("/api/profiles")
def get_profiles():
    """모든 프로필 조회"""
    return jsonify(load_profiles()), 200


@app.post("/api/profiles")
def create_profile():
    """새 프로필 생성"""
    data = request.get_json()
    
    if not data or "user_id" not in data:
        return jsonify({"error": "user_id는 필수입니다"}), 400
    
    profiles = load_profiles()
    
    profile_id = data.get("id") or datetime.now().isoformat()
    
    # 기존 프로필 찾기
    existing = next((p for p in profiles if p.get("id") == profile_id), None)
    
    if existing:
        # 업데이트
        existing.update(data)
        existing["updated_at"] = datetime.now().isoformat()
    else:
        # 새로 추가
        profile = {
            "id": profile_id,
            "interests": data.get("interests", ""),
            "plan": data.get("plan", ""),
            "user_id": data["user_id"],
            "created_at": data.get("created_at", datetime.now().isoformat()),
            "updated_at": datetime.now().isoformat()
        }
        profiles.append(profile)
    
    save_profiles(profiles)
    return jsonify({"success": True, "id": profile_id}), 200


@app.delete("/api/profiles")
def delete_profile():
    """프로필 삭제"""
    profile_id = request.args.get("id")
    
    if not profile_id:
        return jsonify({"error": "id 파라미터가 필요합니다"}), 400
    
    profiles = load_profiles()
    profiles = [p for p in profiles if p.get("id") != profile_id]
    
    save_profiles(profiles)
    return jsonify({"success": True}), 200


# ===== TOTP 인증 API =====

@app.post("/api/auth/register")
def register_user():
    """사용자 등록 - 사용자명, 비밀번호, TOTP 설정"""
    data = request.get_json()
    
    if not data or "username" not in data or "password" not in data:
        return jsonify({"error": "username과 password가 필요합니다"}), 400
    
    username = data["username"].strip()
    password = data["password"].strip()
    
    if not username or not password:
        return jsonify({"error": "username과 password를 입력해주세요"}), 400
    
    if len(password) < 6:
        return jsonify({"error": "비밀번호는 최소 6자 이상이어야 합니다"}), 400
    
    # 사용자 데이터 로드
    users = load_users()
    
    # 이미 등록된 사용자인지 확인
    if username in users:
        return jsonify({"error": "이미 등록된 사용자입니다"}), 400
    
    # 비밀번호 해싱
    hashed_password = bcrypt.hash(password)
    
    # TOTP 비밀키 생성
    secret = pyotp.random_base32()
    
    # TOTP URI 생성 (QR 코드용)
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=username,
        issuer_name="CANJIA"
    )
    
    # QR 코드 생성
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # 이미지를 base64로 변환
    img_buffer = io.BytesIO()
    img.save(img_buffer, format='PNG')
    img_buffer.seek(0)
    img_base64 = base64.b64encode(img_buffer.getvalue()).decode()
    
    # 사용자 저장 (비밀키 포함)
    users[username] = {
        "password": hashed_password,
        "secret": secret,
        "created_at": datetime.now().isoformat()
    }
    save_users(users)
    
    return jsonify({
        "success": True,
        "username": username,
        "secret": secret,
        "qr_code": f"data:image/png;base64,{img_base64}"
    }), 200


@app.post("/api/auth/login")
def login_user():
    """사용자명/비밀번호 로그인 - 1단계"""
    data = request.get_json()
    
    if not data or "username" not in data or "password" not in data:
        return jsonify({"error": "username과 password가 필요합니다"}), 400
    
    username = data["username"].strip()
    password = data["password"].strip()
    
    if not username or not password:
        return jsonify({"error": "username과 password를 입력해주세요"}), 400
    
    # 사용자 데이터 로드
    users = load_users()
    
    # 사용자 확인
    if username not in users:
        return jsonify({"error": "등록되지 않은 사용자입니다"}), 400
    
    # 비밀번호 검증
    hashed_password = users[username]["password"]
    if not bcrypt.verify(password, hashed_password):
        return jsonify({"error": "비밀번호가 올바르지 않습니다"}), 400
    
    # 1단계 로그인 성공 - 세션에 사용자명 저장
    session['login_username'] = username
    
    return jsonify({
        "success": True,
        "username": username,
        "message": "1단계 로그인 성공 - 2단계 인증 필요"
    }), 200


@app.post("/api/auth/verify-2fa")
def verify_2fa():
    """2단계 인증 - TOTP 코드 검증"""
    data = request.get_json()
    
    if not data or "code" not in data:
        return jsonify({"error": "TOTP 코드가 필요합니다"}), 400
    
    code = data["code"].strip()
    
    if not code:
        return jsonify({"error": "TOTP 코드를 입력해주세요"}), 400
    
    # 세션에서 사용자명 확인
    if 'login_username' not in session:
        return jsonify({"error": "먼저 1단계 로그인을 완료해주세요"}), 400
    
    username = session['login_username']
    
    # 사용자 데이터 로드
    users = load_users()
    
    # 사용자 확인
    if username not in users:
        return jsonify({"error": "사용자를 찾을 수 없습니다"}), 400
    
    secret = users[username]["secret"]
    
    # TOTP 검증
    totp = pyotp.TOTP(secret)
    is_valid = totp.verify(code, valid_window=1)  # 1단계 시간 윈도우 허용
    
    if is_valid:
        # 세션에 로그인 완료 표시
        session['authenticated'] = True
        session['username'] = username
        
        return jsonify({
            "success": True,
            "username": username,
            "message": "로그인 성공"
        }), 200
    else:
        return jsonify({
            "success": False,
            "error": "인증 코드가 올바르지 않습니다"
        }), 400


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)