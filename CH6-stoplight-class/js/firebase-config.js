/*
 * Firebase Console → 專案設定 → 您的應用程式 → SDK 設定與配置。
 * 請只替換下方公開的 Web App 設定；不要把服務帳戶金鑰放在前端。
 */
const useLocalEmulators = ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const firebaseConfig = useLocalEmulators ? {
  apiKey: 'demo-key',
  authDomain: 'demo-stoplight-class.firebaseapp.com',
  projectId: 'demo-stoplight-class',
  storageBucket: 'demo-stoplight-class.firebasestorage.app',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:stoplight-demo'
} : {
  apiKey: 'AIzaSyBnPM6eymDt7bA4qK1lhe_u9_jwBcMtwYA',
  authDomain: 'flutter-ai-playground-f0572.firebaseapp.com',
  projectId: 'flutter-ai-playground-f0572',
  storageBucket: 'flutter-ai-playground-f0572.firebasestorage.app',
  messagingSenderId: '299078759079',
  appId: '1:299078759079:web:acc20d1c52232fb13e2182'
};

export const stoplightFirebaseOptions = {
  functionsRegion: 'asia-east1',
  recaptchaEnterpriseSiteKey: '6Lc24GUtAAAAAHsOxJ_OHhSamfeN8pqvp8zLnjSx',
  useEmulators: useLocalEmulators,
  emulatorHost: '127.0.0.1'
};
