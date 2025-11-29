// Firebase Configuration
// Replace these values with your actual Firebase project configuration
// Get these from Firebase Console > Project Settings > General > Your apps > Web app

const firebaseConfig = {
  apiKey: "AIzaSyCBOQG9SGC73eAxXPjY7w-qLSw4RQUtKvI",
  authDomain: "packaging-glamour-hr.firebaseapp.com",
  projectId: "packaging-glamour-hr",
  storageBucket: "packaging-glamour-hr.firebasestorage.app",
  messagingSenderId: "30061300056",
  appId: "1:30061300056:web:3274d4a0138ea18745bd2d",
  measurementId: "G-7GC8V4K75N",
};

// Initialize Firebase immediately
if (typeof firebase !== "undefined" && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Initialize Firebase (will be done after Firebase SDK is loaded)
let auth = null;

// Initialize Firebase after SDK loads
function initializeFirebase() {
  try {
    if (typeof firebase !== "undefined") {
      // Initialize Firebase app
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }

      // Get Auth instance
      auth = firebase.auth();

      // Configure action code settings for password reset
      auth.languageCode = "en";

      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}

// Send password reset email using Firebase
async function sendPasswordResetEmail(email) {
  try {
    if (!auth) {
      initializeFirebase();
    }

    if (!auth) {
      throw new Error("Firebase not initialized");
    }

    // Configure action code settings
    const actionCodeSettings = {
      // URL you want to redirect back to after password reset - use email action handler
      url: `${window.location.origin}${window.location.pathname.replace("packaging-glamour-forgot-password.html", "email-action-handler.html")}`,
      handleCodeInApp: false,
    };

    // Send password reset email
    await auth.sendPasswordResetEmail(email, actionCodeSettings);

    return true;
  } catch (error) {
    throw error;
  }
}

// Get Firebase error message
function getFirebaseErrorMessage(error) {
  const errorMessages = {
    "auth/user-not-found": "No account found with this email address",
    "auth/invalid-email": "Invalid email address",
    "auth/too-many-requests": "Too many requests. Please try again later",
    "auth/network-request-failed":
      "Network error. Please check your connection",
    "auth/internal-error": "An error occurred. Please try again",
  };

  return errorMessages[error.code] || error.message || "An error occurred";
}
