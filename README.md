# CANJIA - 제주 산업 발전 및 네트워크 공동체

Flask + 정적 페이지이며 **네이버 로그인**을 지원합니다. 로컬에서는 **서버 OAuth(authorization code)** 를 쓰는 것을 권장합니다. 브라우저 SDK(implicit)만 쓸 때 발생하던 「CANJIA service error」류 오류를 피하는 데 도움이 됩니다.

## 빠른 시작

### 1. Python

```bash
python --version  # Python 3.9 이상 권장
python -m pip install -r requirements.txt
```

### 2. 네이버 앱 등록

1. [네이버 개발자 센터](https://developers.naver.com/apps)에서 애플리케이션 등록  
2. **사용 API**: 네이버 로그인 (Naver ID Login), **환경**: PC 웹  
3. **서비스 URL**: `http://localhost:5000` (가능하면 `localhost` 로 통일)
4. **Callback URL**(아래 두 번째 줄 **필수** — 등록 문자열과 100% 일치해야 합니다.)
   - `http://localhost:5000/api/auth/naver/callback` (**권장**, 서버 OAuth)
   - (선택) `http://localhost:5000/naver-callback.html` 구형 브라우저 SDK 테스트용  

### 3. 클라이언트 비밀 (서버 플로)

`naver_credentials.example.json`을 복사해 **`naver_credentials.json`** 이름으로 프로젝트 루트에 두고, 네이버 콘솔에서 복사한 **Client ID / Client Secret**을 넣습니다. 이 파일은 **저장 파일은 커밋하지 마세요** (`.gitignore`에 포함).

대안: 환경 변수 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`.

### 4. `naver-config.js`

프론트용 **Client ID**는 계속 `naver-config.js`에 둘 수 있습니다(`server 플로`에서는 서버 자격증명 우선 사용).

### 5. 실행

```bash
python app.py
```

브라우저에서 **`http://localhost:5000`** 으로 엽니다(가능하면 `127.0.0.1` 대신 `localhost`).

### 로그인 동작 요약

- **서버 플로 사용 가능**(비밀이 설정되어 있음)일 때  
  「네이버 로그인」→ `/api/auth/naver/start` 팝업 → 네이버 → `/api/auth/naver/callback` → 팝업이 닫히며 메인에 `postMessage` + `localStorage` 저장.
- 비밀이 **없으면** 과거처럼 `naver-start.html` + 브라우저 SDK(대체 플로)로 시도합니다.

운영 배포 시: `CANJIA_PUBLIC_ORIGIN`(또는 `NAVER_OAUTH_REDIRECT_URI`)과 `FLASK_SECRET_KEY`(고정 문자열로 세션 안정화)를 설정하세요.

## 디버그

- 설정 점검: `http://localhost:5000/naver-debug.html`

## 프로젝트 구조 요약

- `app.py` — 정적 페이지, `/api/auth/naver/*`, `/api/documents`, `/api/profiles`
- `index.html`, `script.js`, `styles.css`
- `naver-config.js`, `naver-start.html`, `naver-callback.html`, 선택 `naver_credentials.json`

## 보안 참고

- 프로덕션은 HTTPS 및 실제 도메인 등록 후 콜백 URL 교체가 필요합니다.
