// Test-only configuration. These are fake values; no real secret is used in tests.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.JWT_REFRESH_SECRET = "test-jwt-refresh-secret";
process.env.REFRESH_TOKEN_SECRET = "test-student-refresh-secret";
process.env.REFRESH_TOKEN_EXPIRY = "7d";
process.env.SESSION_SECRET = "test-session-secret";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.STUDENT_URL = "http://localhost:5174";
process.env.CORS_WHITELIST = "https://school.example/,https://student.example";
process.env.RESET_RATE_LIMIT_MAX = "1000";
// Dummy Firebase values so importing the upload helpers does not fail
process.env.FIREBASE_API_KEY = "test";
process.env.FIREBASE_AUTH_DOMAIN = "test.firebaseapp.com";
process.env.FIREBASE_PROJECT_ID = "test";
process.env.FIREBASE_STORAGE_BUCKET = "test.appspot.com";
process.env.FIREBASE_MESSAGING_SENDER_ID = "0";
process.env.FIREBASE_APP_ID = "test";
