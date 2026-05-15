# CANJIA - 제주 산업 발전 및 네트워크 공동체

네이버 로그인이 작동하지 않을 때의 설정 가이드

## 🚀 빠른 시작

### 1단계: Python 환경 설정
```bash
pip install -r requirements.txt
```

### 2단계: 네이버 개발자 센터 등록

#### A. 네이버 개발자 센터 방문
1. [네이버 개발자 센터](https://developers.naver.com) 방문
2. 우측 상단 **로그인** (네이버 계정 필요)

#### B. 애플리케이션 등록
1. 상단 **Application** 메뉴
2. **애플리케이션 등록** 버튼 클릭
3. 다음 정보 입력:
   - **애플리케이션 이름**: CANJIA
   - **사용 API**: 검색창에서 "로그인" 검색 > **Naver ID Login** 선택
   - **환경**: PC 웹
   - **비로그인 오픈 API**: 선택 안 함

#### C. 서비스 URL 등록
1. **개발 환경**:
   - 서비스 URL: `http://localhost:5000`
   - Callback URL: `http://localhost:5000/naver-callback.html`

2. **배포 환경** (나중에):
   - 서비스 URL: `https://yourdomain.com`
   - Callback URL: `https://yourdomain.com/naver-callback.html`

#### D. Client ID 복사
1. 등록 완료 후 **내 애플리케이션** 메뉴에서 CANJIA 선택
2. **Client ID** 복사

### 3단계: naver-config.js 설정

`naver-config.js` 파일을 텍스트 에디터로 열고:

```javascript
window.NAVER_LOGIN_CONFIG = {
  clientId: "YOUR_NAVER_CLIENT_ID",  // ← 여기에 Client ID 붙여넣기
  callbackUrl: new URL("naver-callback.html", window.location.href).href,
  serviceUrl: new URL(".", window.location.href).href
};
```

예시:
```javascript
window.NAVER_LOGIN_CONFIG = {
  clientId: "mG82KmZ1Qg2OxZ0QyZ1Qw",  // 실제 Client ID
  callbackUrl: new URL("naver-callback.html", window.location.href).href,
  serviceUrl: new URL(".", window.location.href).href
};
```

### 4단계: 서버 실행

```bash
python app.py
```

브라우저에서 `http://localhost:5000` 방문

## 🔍 문제 해결

### 1. "네이버 로그인 버튼이 보이지 않음"
→ **naver-config.js에 Client ID가 설정되지 않았습니다**
- `naver-config.js` 파일을 확인하고 Client ID를 입력하세요

### 2. "네이버 SDK를 불러올 수 없음"
→ **네트워크 문제**
- 인터넷 연결 확인
- https://static.nid.naver.com/js/naverLogin_implicit-1.0.3.js 접근 확인

### 3. "Callback URL 불일치 오류"
→ **등록된 Callback URL과 실제 URL이 다릅니다**
- 네이버 개발자 센터에서 등록한 URL: `http://localhost:5000/naver-callback.html`
- `naver-config.js`의 callbackUrl이 일치하는지 확인

### 4. "로그인은 되지만 프로필이 저장되지 않음"
→ **백엔드 API 연결 오류**
- Flask 서버가 실행 중인지 확인
- `data/` 디렉토리 생성 권한 확인

## 📝 디버그 페이지

설정 상태를 확인하려면:
```
http://localhost:5000/naver-debug.html
```

여기서 다음을 확인할 수 있습니다:
- ✅ Client ID 설정 상태
- ✅ 네이버 SDK 로딩 상태
- ✅ Callback URL 설정
- ✅ Service URL 설정

## 📂 프로젝트 구조

```
New project/
├── app.py                    # Flask 백엔드
├── index.html                # 메인 페이지
├── naver-callback.html       # 네이버 로그인 콜백
├── naver-config.js           # ⭐ 네이버 설정 (Client ID 필수)
├── naver-debug.html          # 디버그 페이지
├── script.js                 # 프론트엔드 로직
├── styles.css                # 스타일
├── requirements.txt          # Python 의존성
└── data/                     # 저장된 데이터
    ├── documents.json        # 문서 데이터
    └── profiles.json         # 사용자 프로필 데이터
```

## 🔐 보안 주의사항

⚠️ **프로덕션 배포 시**:
1. `naver-config.js`의 Client ID를 환경 변수로 관리
2. HTTPS 사용 필수
3. Callback URL을 실제 도메인으로 변경
4. 민감한 정보는 백엔드에서만 처리

## 📞 지원

추가 도움이 필요하면:
- 네이버 개발자 센터 문서: https://developers.naver.com/docs/login/overview
- 네이버 로그인 SDK: https://developers.naver.com/docs/login/sdk
