# CANJIA - 제주 산업 발전 및 네트워크 공동체

마이크로소프트 로그인 설정 가이드

## 🚀 빠른 시작

### 1단계: Python 환경 설정
```bash
pip install -r requirements.txt
```

### 2단계: 마이크로소프트 Azure 등록

#### A. Azure Portal 방문
1. [Azure Portal](https://portal.azure.com) 방문
2. Microsoft 계정 또는 회사 계정으로 로그인

#### B. Azure Active Directory 앱 등록
1. 좌측 사이드바에서 **Azure Active Directory** 검색 및 선택
2. **앱 등록** 메뉴 클릭
3. **+ 새 등록** 버튼 클릭

#### C. 앱 정보 입력
다음 정보를 입력하고 **등록** 클릭:

```
이름: CANJIA
지원 계정 유형: 모든 조직 디렉토리의 계정 및 개인 Microsoft 계정
리디렉션 URI (웹): http://localhost:5000/ms-callback.html
```

#### D. Application ID 복사
1. 등록 완료 후 **개요** 페이지로 이동
2. **Application (Client) ID** 값 복사 (32자리 영문/숫자)

### 3단계: ms-config.js 설정

`ms-config.js` 파일을 텍스트 에디터로 열고:

```javascript
window.MS_LOGIN_CONFIG = {
  clientId: "YOUR_MICROSOFT_CLIENT_ID",  // ← 여기에 Application ID 붙여넣기
  redirectUri: new URL("ms-callback.html", window.location.href).href,
  scopes: ["user.read", "profile", "email", "openid"],
  authority: "https://login.microsoftonline.com/common"
};
```

예시:
```javascript
window.MS_LOGIN_CONFIG = {
  clientId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",  // 실제 Application ID
  redirectUri: new URL("ms-callback.html", window.location.href).href,
  scopes: ["user.read", "profile", "email", "openid"],
  authority: "https://login.microsoftonline.com/common"
};
```

### 4단계: 서버 실행

```bash
python app.py
```

브라우저에서 `http://localhost:5000` 방문

## 🔍 문제 해결

### 1. "마이크로소프트 로그인 버튼이 보이지 않음"
→ **ms-config.js에 Application ID가 설정되지 않았습니다**
- `ms-config.js` 파일을 확인하고 Application ID를 입력하세요

### 2. "Invalid redirect_uri 오류"
→ **등록된 리디렉션 URI와 설정이 다릅니다**
- Azure Portal에서 등록한 URI: `http://localhost:5000/ms-callback.html`
- ms-config.js의 redirectUri와 일치하는지 확인

### 3. "마이크로소프트 SDK를 불러올 수 없음"
→ **네트워크 문제**
- 인터넷 연결 확인
- https://alcdn.msauth.net/browser/2.45.0/js/msal-browser.min.js 접근 확인

### 4. "로그인은 되지만 프로필이 저장되지 않음"
→ **백엔드 API 연결 오류**
- Flask 서버가 실행 중인지 확인
- `data/` 디렉토리 생성 권한 확인

## 📝 디버그 페이지

설정 상태를 확인하려면:
```
http://localhost:5000/ms-debug.html
```

여기서 다음을 확인할 수 있습니다:
- ✅ Application ID 설정 상태
- ✅ 마이크로소프트 SDK 로딩 상태
- ✅ 리디렉션 URI 설정
- ✅ Authority 설정

## 📂 프로젝트 구조

```
New project/
├── app.py                    # Flask 백엔드
├── index.html                # 메인 페이지
├── ms-callback.html          # 마이크로소프트 로그인 콜백
├── ms-config.js              # ⭐ 마이크로소프트 설정 (Application ID 필수)
├── ms-debug.html             # 디버그 페이지
├── script.js                 # 프론트엔드 로직
├── styles.css                # 스타일
├── requirements.txt          # Python 의존성
└── data/                     # 저장된 데이터
    ├── documents.json        # 문서 데이터
    └── profiles.json         # 사용자 프로필 데이터
```

## 🔐 보안 주의사항

⚠️ **프로덕션 배포 시**:
1. `ms-config.js`의 Application ID를 환경 변수로 관리
2. HTTPS 사용 필수
3. 리디렉션 URI를 실제 도메인으로 변경
4. 클라이언트 암호는 백엔드에서만 사용

## 📞 지원

추가 도움이 필요하면:
- Microsoft 로그인 문서: https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-overview
- MSAL.js 문서: https://learn.microsoft.com/en-us/azure/active-directory/develop/msal-browser-migration-guide
