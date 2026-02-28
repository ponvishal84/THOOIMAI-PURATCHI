const translations = {
    en: {
        titleTamil: "தூய்மை புரட்சி",
        titleEnglish: "Thooimai Puratchi",
        welcomeHeading: "Welcome to the Clean Revolution",
        subtitle: "Together for a Cleaner Madurai",
        emailPlaceholder: "Email Address",
        passwordPlaceholder: "Password",
        forgotPassword: "Forgot Password?",
        loginBtn: "Login",
        orDivider: "or",
        googleLogin: "Login with Google",
        newHere: "New here? ",
        signUp: "Sign Up",
        volunteerCount: "Join 2,500+ Volunteers",
        errorEmpty: "Please enter both email and password.",
        errorInvalid: "Invalid email or password.",
        errorFailed: "Login failed. "
    },
    ta: {
        titleTamil: "தூய்மை புரட்சி",
        titleEnglish: "Thooimai Puratchi",
        welcomeHeading: "தூய்மை புரட்சிக்கு வரவேற்கிறோம்",
        subtitle: "தூய்மையான மதுரைக்காக ஒன்றிணைவோம்",
        emailPlaceholder: "மின்னஞ்சல் முகவரி",
        passwordPlaceholder: "கடவுச்சொல்",
        forgotPassword: "கடவுச்சொல் மறந்துவிட்டதா?",
        loginBtn: "உள்நுழை",
        orDivider: "அல்லது",
        googleLogin: "Google மூலம் உள்நுழைக",
        newHere: "புதியவரா? ",
        signUp: "பதிவு செய்க",
        volunteerCount: "2,500+ தொண்டர்களுடன் இணையுங்கள்",
        errorEmpty: "தயவுசெய்து மின்னஞ்சல் மற்றும் கடவுச்சொல்லை உள்ளிடவும்.",
        errorInvalid: "தவறான மின்னஞ்சல் அல்லது கடவுச்சொல்.",
        errorFailed: "உள்நுழைவு தோல்வியடைந்தது. "
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Determine the current language from localStorage (default to 'en')
    const currentLang = localStorage.getItem('appLanguage') || 'en';
    const langData = translations[currentLang];

    const langToggleBtn = document.getElementById('langToggleBtn');
    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', () => {
            const newLang = currentLang === 'en' ? 'ta' : 'en';
            localStorage.setItem('appLanguage', newLang);
            window.location.reload();
        });
    }

    if (!langData) return;

    // A helper function to safely update text content if element exists
    const updateText = (id, text) => {
        const el = document.getElementById(id);
        if (el) {
            // If it's an input field we might want to update the placeholder instead
            if (el.tagName === 'INPUT') {
                el.placeholder = text;
            } else {
                el.textContent = text;
            }
        }
    };

    // A helper function to safely update text content for elements selected by class
    const updateTextByClass = (className, text) => {
        const elements = document.querySelectorAll(className);
        elements.forEach(el => {
            el.textContent = text;
        });
    };

    // --- Apply Translations to index.html ---

    // We update elements directly if we know their IDs or specific structure classes.
    updateTextByClass('.heading', langData.welcomeHeading);
    updateTextByClass('.subtitle', langData.subtitle);

    updateText('email', langData.emailPlaceholder);
    updateText('password', langData.passwordPlaceholder);

    const forgotLinks = document.querySelectorAll('.forgot-link');
    if (forgotLinks.length > 0) forgotLinks[0].textContent = langData.forgotPassword;

    const btnText = document.querySelector('.btn-text');
    if (btnText) btnText.textContent = langData.loginBtn;

    const dividerSpan = document.querySelector('.divider-text span');
    if (dividerSpan) dividerSpan.textContent = langData.orDivider;

    const googleBtnSpan = document.querySelector('#googleLoginBtn span');
    if (googleBtnSpan) googleBtnSpan.textContent = langData.googleLogin;

    const signupPromptP = document.querySelector('.signup-prompt p');
    if (signupPromptP) {
        // Rebuild the prompt since it contains a nested link
        signupPromptP.innerHTML = `${langData.newHere}<a href="#" class="signup-link">${langData.signUp}</a>`;
    }

    const statText = document.querySelector('.stat-text');
    if (statText) {
        statText.innerHTML = `<i class="fa-solid fa-users"></i> ${langData.volunteerCount}`;
    }

    // Export translations for auth.js to use for dynamic error messages
    window.appTranslations = langData;
});
