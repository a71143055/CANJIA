window.NAVER_LOGIN_CONFIG = {
  // 네이버 개발자센터의 Client ID를 넣고, 등록한 Callback URL과 일치시켜 주세요.
  // 실제 배포에서는 file:// 대신 https:// 또는 http://localhost 주소를 권장합니다.
  clientId: "YOUR_NAVER_CLIENT_ID",
  callbackUrl: new URL("naver-callback.html", window.location.href).href,
  serviceUrl: new URL(".", window.location.href).href
};
