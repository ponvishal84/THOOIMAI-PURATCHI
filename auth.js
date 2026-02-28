// Initialize Firebase services using Compat SDK
const auth = firebase.auth();
const db = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();


document.addEventListener('DOMContentLoaded', () => {

    // Add sparkles background effect
    createSparkles();

    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const loginSpinner = document.getElementById('loginSpinner');
    const btnText = document.querySelector('.btn-text');
    const errorMessage = document.getElementById('errorMessage');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const togglePassword = document.getElementById('togglePassword');

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        loginSpinner.style.display = 'none';
        btnText.style.display = 'block';
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (!email || !password) {
                showError("Please enter both email and password.");
                return;
            }

            // Show spinner
            loginSpinner.style.display = 'block';
            btnText.style.display = 'none';
            errorMessage.style.display = 'none';

            if (!auth || (window.firebaseConfig && window.firebaseConfig.apiKey === "YOUR_API_KEY")) {
                // Mock behavior if firebase isn't configured so the UI doesn't look broken
                setTimeout(() => {
                    showError("Firebase is not configured. Please add your credentials in auth.js");
                }, 1000);
                return;
            }

            try {
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                console.log("Logged in user:", userCredential.user);
                // Redirect to dashboard page
                window.location.href = "dashboard.html";
            } catch (error) {
                const errorCode = error.code;
                const errorMsg = error.message;
                console.error(errorCode, errorMsg);

                // Format friendly error messages
                if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
                    showError("Invalid email or password.");
                } else {
                    showError("Login failed. " + errorMsg);
                }
            }
        });
    }

    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            if (!auth || (window.firebaseConfig && window.firebaseConfig.apiKey === "YOUR_API_KEY")) {
                showError("Firebase is not configured. Please add your credentials in auth.js");
                return;
            }

            try {
                const result = await auth.signInWithPopup(googleProvider);
                console.log("Google Logged in user:", result.user);
                window.location.href = "dashboard.html";
            } catch (error) {
                console.error("Google Login Error:", error.message);
                showError("Google login failed. " + error.message);
            }
        });
    }

    // Password visibility toggle (long press to see)
    if (togglePassword && passwordInput) {
        // Functions to show/hide
        const showPassword = (e) => {
            e.preventDefault(); // Prevent default mobile actions like text selection
            passwordInput.type = 'text';
            togglePassword.classList.remove('fa-eye');
            togglePassword.classList.add('fa-eye-slash');
        };

        const hidePassword = () => {
            passwordInput.type = 'password';
            togglePassword.classList.remove('fa-eye-slash');
            togglePassword.classList.add('fa-eye');
        };

        // Desktop events
        togglePassword.addEventListener('mousedown', showPassword);
        togglePassword.addEventListener('mouseup', hidePassword);
        togglePassword.addEventListener('mouseleave', hidePassword);

        // Mobile touch events
        togglePassword.addEventListener('touchstart', showPassword, { passive: false });
        togglePassword.addEventListener('touchend', hidePassword);
        togglePassword.addEventListener('touchcancel', hidePassword);
    }
});

function createSparkles() {
    const container = document.getElementById('sparkles');
    if (!container) return;

    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            const sparkle = document.createElement('div');
            sparkle.classList.add('sparkle');
            sparkle.style.left = Math.random() * 100 + 'vw';
            sparkle.style.top = Math.random() * 100 + 'vh';

            // Random animation duration between 3s and 6s
            sparkle.style.animationDuration = (Math.random() * 3 + 3) + 's';
            // Random delay
            sparkle.style.animationDelay = Math.random() * 5 + 's';

            container.appendChild(sparkle);
        }, i * 150);
    }
}
