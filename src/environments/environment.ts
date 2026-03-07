// ─────────────────────────────────────────────────────────
//  DEVELOPMENT ENVIRONMENT
//
//  TO ACCESS FROM YOUR PHONE:
//  Replace 'localhost' below with your computer's WiFi IP
//  Example: if your PC IP is 192.168.1.5, change to:
//    apiUrl: 'http://192.168.1.5:8080/api'
//
//  Find your PC IP:
//    Windows: run  ipconfig  → look for "IPv4 Address"
//    Mac/Linux: run  ifconfig  → look for "inet" under en0/wlan
// ─────────────────────────────────────────────────────────
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',
  wsUrl: 'http://localhost:8080'
};
