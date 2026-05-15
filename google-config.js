/**
 * Google OAuth 2.0 설정
 * 
 * Google 클라이언트 ID 받기:
 * 1. https://console.cloud.google.com 방문
 * 2. 프로젝트 생성 또는 선택
 * 3. OAuth 2.0 동의 화면 설정
 * 4. 사용자 인증 정보 > OAuth 2.0 클라이언트 ID 생성 (웹 애플리케이션)
 * 5. 승인된 리디렉션 URI 추가:
 *    - 개발 환경: http://localhost:5000/google-callback.html
 *    - 배포 환경: https://yourdomain.com/google-callback.html
 */

window.GOOGLE_LOGIN_CONFIG = {
  // https://console.cloud.google.com에서 확인 가능
  clientId: "YOUR_GOOGLE_CLIENT_ID",

  // 등록한 Callback URL (google-callback.html의 경로)
  redirectUri: new URL("google-callback.html", window.location.href).href,

  // Google OAuth 스코프
  scope: "profile email openid",

  // Google Discovery 문서
  discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/people/v1/rest"]
};
