/**
 * CANJIA 마이크로소프트 로그인 설정
 * 
 * 마이크로소프트 로그인을 활성화하려면:
 * 1. https://portal.azure.com 방문 (Azure 계정 필요)
 * 2. "Azure Active Directory" > "앱 등록"
 * 3. "새 등록" 클릭
 * 4. 다음 정보 입력:
 *    - 이름: CANJIA
 *    - 지원 계정 유형: 모든 조직 디렉토리의 계정 및 개인 Microsoft 계정
 *    - 리디렉션 URI: 웹 > http://localhost:5000/ms-callback.html
 * 5. 등록 후 "증명서 및 암호"에서 클라이언트 암호 생성
 * 6. Application ID와 클라이언트 암호를 아래에 입력
 */

window.MS_LOGIN_CONFIG = {
  // Azure Portal에서 발급받은 Application (Client) ID
  // https://portal.azure.com > Azure Active Directory > 앱 등록 > CANJIA에서 확인
  clientId: "YOUR_MICROSOFT_CLIENT_ID",
  
  // 마이크로소프트 로그인 리디렉션 URI
  redirectUri: new URL("ms-callback.html", window.location.href).href,
  
  // Microsoft Graph API 스코프
  scopes: ["user.read", "profile", "email", "openid"],
  
  // Azure 테넌트 (common = 모든 테넌트)
  authority: "https://login.microsoftonline.com/common"
};
