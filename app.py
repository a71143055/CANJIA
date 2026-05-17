from pathlib import Path
import json
import os
from datetime import datetime
from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS

BASE_DIR = Path(__file__).resolve().parent

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "canjia-dev-insecure-change-me"
CORS(app, supports_credentials=True)

# 저장소 파일 경로
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
DOCUMENTS_FILE = DATA_DIR / "documents.json"
PROFILES_FILE = DATA_DIR / "profiles.json"


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


# ===== API 라우트 =====

# 정적 파일 제공
@app.get("/")
def serve_index():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/<filename>")
def serve_static(filename):
    if filename in ["index.html", "script.js", "styles.css", "naver-config.js", 
                    "naver-callback.html", "naver-debug.html"]:
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


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
