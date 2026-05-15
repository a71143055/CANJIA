/**
 * CANJIA 네이버 로그인 설정
 * 
 * 네이버 로그인을 활성화하려면:
 * 1. https://developers.naver.com 방문
 * 2. 로그인 후 "Application" 메뉴 > "애플리케이션 등록"
 * 3. 다음 정보로 앱 등록:
 *    - 애플리케이션 이름: CANJIA
 *    - 사용 API: Naver ID Login
 *    - 환경: PC 웹
 *    - 비로그인 오픈 API 필요 여부: 선택 안 함
 * 4. 서비스 URL 등록:
 *    - 개발 환경: http://localhost:5000
 *    - 배포 환경: https://yourdomain.com
 * 5. Callback URL 등록:
 *    - 개발 환경: http://localhost:5000/naver-callback.html
 *    - 배포 환경: https://yourdomain.com/naver-callback.html
 * 6. 등록 후 받은 "Client ID"를 아래에 입력
 */

window.NAVER_LOGIN_CONFIG = {
  // 네이버 개발자센터에서 발급받은 Client ID
  // https://developers.naver.com/apps 에서 확인 가능
  clientId: "NXdjdYA_c8Ujg1GgvgH3",
  
  // 등록한 Callback URL (naver-callback.html의 경로)
  callbackUrl: new URL("naver-callback.html", window.location.href).href,
  
  // 서비스 URL (네이버 개발자센터에 등록한 URL)
  serviceUrl: new URL(".", window.location.href).href
};
