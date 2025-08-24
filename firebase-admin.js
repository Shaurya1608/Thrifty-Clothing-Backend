const admin = require('firebase-admin');

// Temporarily disable Firebase Admin to avoid configuration errors
let isFirebaseConfigured = false;

try {
  // Initialize Firebase Admin SDK
  const serviceAccount = {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
  };

  // Check if all required fields are present
  if (serviceAccount.project_id && serviceAccount.private_key && serviceAccount.client_email) {
    // Initialize the app
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    isFirebaseConfigured = true;
    console.log('✅ Firebase Admin SDK initialized successfully');
  } else {
    console.log('⚠️ Firebase Admin SDK not configured - some features will be limited');
  }
} catch (error) {
  console.log('⚠️ Firebase Admin SDK initialization failed:', error.message);
  console.log('⚠️ Registration will still work with client-side Firebase Auth');
}

module.exports = { admin, isFirebaseConfigured };

