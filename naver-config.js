// Naver OAuth Configuration
// Replace CLIENT_ID with your actual Naver Client ID
// Go to https://developers.naver.com/apps to create an app and get your Client ID

const NAVER_CONFIG = {
  CLIENT_ID: "YOUR_NAVER_CLIENT_ID",  // Replace with your actual Client ID
  REDIRECT_URI: window.location.origin + "/naver-callback.html",
  STATE: Math.random().toString(36).substring(7)  // Random state for CSRF protection
};
