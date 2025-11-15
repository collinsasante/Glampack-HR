// Firebase Configuration
// Replace these values with your actual Firebase project configuration
// Get these from Firebase Console > Project Settings > General > Your apps > Web app

const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase (will be done after Firebase SDK is loaded)
let auth = null;

// Initialize Firebase after SDK loads
function initializeFirebase() {
    try {
        if (typeof firebase !== 'undefined') {
            // Initialize Firebase app
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }

            // Get Auth instance
            auth = firebase.auth();

            // Configure action code settings for password reset
            auth.languageCode = 'en';

            console.log('✅ Firebase initialized successfully');
            return true;
        } else {
            console.warn('⚠️ Firebase SDK not loaded yet');
            return false;
        }
    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
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
            throw new Error('Firebase not initialized');
        }

        // Configure action code settings
        const actionCodeSettings = {
            // URL you want to redirect back to after password reset
            url: `${window.location.origin}${window.location.pathname.replace('packaging-glamour-forgot-password.html', 'packaging-glamour-signin.html')}`,
            handleCodeInApp: false
        };

        // Send password reset email
        await auth.sendPasswordResetEmail(email, actionCodeSettings);

        return true;
    } catch (error) {
        console.error('Firebase password reset error:', error);
        throw error;
    }
}

// Get Firebase error message
function getFirebaseErrorMessage(error) {
    const errorMessages = {
        'auth/user-not-found': 'No account found with this email address',
        'auth/invalid-email': 'Invalid email address',
        'auth/too-many-requests': 'Too many requests. Please try again later',
        'auth/network-request-failed': 'Network error. Please check your connection',
        'auth/internal-error': 'An error occurred. Please try again'
    };

    return errorMessages[error.code] || error.message || 'An error occurred';
}

console.log('📧 Firebase Email Service Configuration Loaded');
