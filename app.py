from pathlib import Path

from flask import Flask, send_from_directory


BASE_DIR = Path(__file__).resolve().parent

app = Flask(__name__)


def send_project_file(filename: str):
    return send_from_directory(BASE_DIR, filename)


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


if __name__ == "__main__":
    app.run(debug=True)
