// Naver OAuth Configuration (Authorization Code Flow)
// Replace CLIENT_ID and CLIENT_SECRET with your actual credentials
// Go to https://developers.naver.com/apps to create an app

const NAVER_CONFIG = {
  CLIENT_ID: "YOUR_NAVER_CLIENT_ID",           // Replace with your actual Client ID
  CLIENT_SECRET: "YOUR_NAVER_CLIENT_SECRET",   // Replace with your actual Client Secret
  REDIRECT_URI: window.location.origin + "/naver-callback.html",
  AUTH_URL: "https://nid.naver.com/oauth2.0/authorize",
  TOKEN_URL: "https://nid.naver.com/oauth2.0/token",
  PROFILE_URL: "https://openapi.naver.com/v1/nid/me"
};
