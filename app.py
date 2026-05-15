from pathlib import Path
import json
from datetime import datetime

from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS


BASE_DIR = Path(__file__).resolve().parent

app = Flask(__name__)
CORS(app)

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


# 정적 파일 경로
@app.get("/")
def index():
    return send_project_file("index.html")


@app.get("/naver-callback")
@app.get("/naver-callback.html")
def naver_callback():
    return send_project_file("naver-callback.html")


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


# API 엔드포인트
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
    
    profiles = load_profiles()
    email = data.get("email")
    
    profiles[email] = {
        "email": email,
        "name": data.get("name", ""),
        "nickname": data.get("nickname", ""),
        "profileImage": data.get("profileImage", ""),
        "interest": data.get("interest", ""),
        "joined": data.get("joined", datetime.now().isoformat())
    }
    
    save_profiles(profiles)
    return jsonify(profiles[email]), 201


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
