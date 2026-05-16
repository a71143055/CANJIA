/**
 * CANJIA 네이버 로그인 설정
 *
 * 네이버 로그인을 활성화하려면:
 * 1. https://developers.naver.com 방문
 * 2. 로그인 후 "Application" 메뉴 > "애플리케이션 등록"
 * 3. 사용 API: Naver ID Login · 환경: PC 웹
 * 4. 서비스 URL: 로컬에서는 http://localhost:5000 (127.0.0.1로 접속 시에도 여기에는 localhost 로 등록·일치시키는 것을 권장)
 * 5. Callback URL (둘 다 등록 가능):
 *    - 권장(서버 OAuth): http://localhost:5000/api/auth/naver/callback
 *    - 구형(JS SDK만): http://localhost:5000/naver-callback.html
 * 6. Client ID를 아래에 입력
 */

(function () {
  if (typeof window === "undefined") return;

  const loc = window.location;

  /** 개발 환경 file:// 또는 서버 실행 전 미리보기용 기본 호스트 */
  const devOrigin = "http://localhost:5000";

  if (loc.protocol === "file:") {
    window.NAVER_LOGIN_CONFIG = {
      clientId: "NXdjdYA_c8Ujg1GgvgH3",
      callbackUrl: new URL("naver-callback.html", devOrigin + "/").href,
      serviceUrl: devOrigin + "/"
    };
    return;
  }

  const u = new URL(loc.href);
  // 네이버 콘솔에 보통 localhost 로 등록하므로 127.0.0.1 접속 시에도 redirect_uri 를 localhost 로 맞춤
  if (u.hostname === "127.0.0.1") {
    u.hostname = "localhost";
  }

  const base = u.origin + "/";
  window.NAVER_LOGIN_CONFIG = {
    // 네이버 개발자센터에서 발급받은 Client ID
    clientId: "NXdjdYA_c8Ujg1GgvgH3",
    callbackUrl: new URL("naver-callback.html", base).href,
    serviceUrl: base
  };
})();
