# CANJIA - 제주 산업 발전 및 네트워크 공동체

네이버 로그인 연동 포함 소규모 Flask + 정적 페이지 앱입니다.

## 빠른 시작

### 1. Python 환경

```bash
python --version  # Python 3.9 이상 권장
python -m pip install -r requirements.txt
```

### 2. 네이버 개발자 등록

1. [네이버 개발자 센터](https://developers.naver.com/apps)에서 애플리케이션 등록  
2. **사용 API**: 네이버 로그인 (Naver ID Login)  
3. **서비스 URL** 예: `http://localhost:5000`  
4. **Callback URL**는 반드시 등록해야 합니다. 예:  
   `http://localhost:5000/naver-callback.html`  
5. 발급받은 **Client ID**를 `naver-config.js`의 `clientId`에 넣습니다.

### 3. 실행

```bash
python app.py
```

브라우저에서 `http://localhost:5000`을 엽니다.

**로그인 흐름:** 메인 페이지의 「네이버 로그인」→ `naver-start.html`(팝업)에서 네이버 제공 버튼으로 인증→ `naver-callback.html`에서 프로필 수집 후 메인 창에 `postMessage`로 결과를 알립니다.

## 디버그

- 설정 점검: `http://localhost:5000/naver-debug.html`

레거시로 구글·마이크로소프트용 HTML·라우트 파일이 포함되어 있을 수 있지만, 메인 UX는 네이버 로그인만 사용합니다.

## 프로젝트 구조 요약

- `app.py` — Flask, 정적 페이지 및 `/api/documents`, `/api/profiles`  
- `index.html`, `script.js`, `styles.css` — 메인 UI  
- `naver-config.js`, `naver-start.html`, `naver-callback.html` — 네이버 로그인  
- `data/` — `documents.json`, `profiles.json` (실행 시 자동 생성 가능)

## 보안 참고

- 프로덕션에서는 HTTPS와 실제 도메인으로 서비스·콜백 URL을 다시 등록하세요.
