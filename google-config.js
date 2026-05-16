/**
 * CANJIA Google OAuth 설정
 *
 * Google 로그인을 활성화하려면:
 * 1. https://console.cloud.google.com 방문
 * 2. 새 프로젝트 생성
 * 3. "APIs & Services" > "OAuth 2.0 클라이언트 ID" 생성
 * 4. 승인된 리디렉션 URI: http://localhost:5000/api/auth/google/callback
 * 5. 받은 Client ID를 아래에 입력
 */

(function () {
  if (typeof window === "undefined") return;

  const loc = window.location;

  /** 개발 환경 file:// 또는 서버 실행 전 미리보기용 기본 호스트 */
  const devOrigin = "http://localhost:5000";

  if (loc.protocol === "file:") {
    window.GOOGLE_LOGIN_CONFIG = {
      clientId: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
      redirectUri: devOrigin + "/api/auth/google/callback"
    };
    return;
  }

  const u = new URL(loc.href);
  // 127.0.0.1 접속 시에도 redirect_uri 를 localhost 로 맞춤
  if (u.hostname === "127.0.0.1") {
    u.hostname = "localhost";
  }

  const base = u.origin;
  window.GOOGLE_LOGIN_CONFIG = {
    // Google 클라우드 콘솔에서 발급받은 Client ID
    clientId: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
    redirectUri: base + "/api/auth/google/callback"
  };
})();
