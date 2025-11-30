/* js/auth.js - SECURE CLIENT-SIDE VERSION */

// ==========================================
// 🔧 CONFIGURATION (PASTE YOUR KEYS HERE)
// ==========================================
const EMAILJS_SERVICE_ID = "service_gr6vthl";   
const EMAILJS_TEMPLATE_ID = "template_r3t9j8l"; 
const IDLE_TIMEOUT_MS = 2 * 60 * 1000; // 2 Minutes Auto-Logout

let generatedOTP = null; 
let idleTimer = null; 

// ==========================================
// 0. SECURITY HELPERS
// ==========================================

// Prevent HTML Injection
function sanitizeInput(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

// Check if spam timer is active
function checkCooldown() {
    const unlockTime = localStorage.getItem('otp_unlock_time');
    if (!unlockTime) return 0;
    
    const remaining = parseInt(unlockTime) - Date.now();
    return remaining > 0 ? remaining : 0;
}

// Start Visual Timer on Button
function startCooldownUI(btn) {
    if(!btn) return;
    btn.disabled = true;
    
    const timer = setInterval(() => {
        const remaining = checkCooldown();
        
        if (remaining <= 0) {
            clearInterval(timer);
            localStorage.removeItem('otp_unlock_time');
            btn.innerText = "Login / Resend OTP";
            btn.disabled = false;
        } else {
            btn.innerText = `Resend in ${Math.ceil(remaining / 1000)}s`;
        }
    }, 1000);
}

// ==========================================
// 1. REGISTRATION (With Domain Restriction)
// ==========================================
function registerUser() {
    // SECURITY: Sanitize Input
    const rawName = document.getElementById("fullName").value;
    const fullName = sanitizeInput(rawName);

    const collegeId = document.getElementById("regCollegeId").value;
    const email = document.getElementById("regEmail").value.trim().toLowerCase();
    const password = document.getElementById("regPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (!fullName || !collegeId || !email || !password || !confirmPassword) {
        alert("Please fill in all fields.");
        return;
    }

    // 🔒 SECURITY: DOMAIN CHECK
    if (!email.endsWith("@rvce.edu.in")) {
        alert("Registration Restricted: \nYou must use your official college email (@rvce.edu.in).");
        return;
    }

    // PASSWORD STRENGTH CHECK
    const strongPasswordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,}$/;
    if (!strongPasswordRegex.test(password)) {
        alert("Weak Password! \nMust be at least 6 characters, include 1 number (0-9) and 1 special symbol (!@#$%).");
        return;
    }

    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    const btn = document.querySelector('button');
    btn.innerText = "Creating Account...";
    btn.disabled = true;

    // A. Create User in Firebase Auth
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            
            // B. Save User Details in Firestore
            return db.collection("users").doc(user.uid).set({
                fullName: fullName,
                collegeId: collegeId.toUpperCase(),
                email: email,
                hasVoted: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            return auth.signOut();
        })
        .then(() => {
            alert("Registration Successful! Please Login.");
            window.location.href = "login.html";
        })
        .catch((error) => {
            console.error(error);
            alert("Error: " + error.message);
            btn.innerText = "Sign Up";
            btn.disabled = false;
        });
}

// ==========================================
// 2. LOGIN FLOW (Email Only + Domain Check)
// ==========================================
async function loginUser() {
    // SECURITY: Check Sticky Timer
    const remainingTime = checkCooldown();
    if (remainingTime > 0) {
        alert(`Please wait ${Math.ceil(remainingTime / 1000)} seconds before requesting another OTP.`);
        return;
    }

    const input = document.getElementById("loginInput").value.trim().toLowerCase(); 
    const password = document.getElementById("password").value;

    if (!input || !password) {
        alert("Please fill in all fields.");
        return;
    }

    // 🔒 SECURITY: DOMAIN CHECK
    if (!input.endsWith("@rvce.edu.in")) {
        alert("Access Denied: \nOnly official @rvce.edu.in email addresses are allowed.");
        return;
    }

    const btn = document.querySelector('button');
    btn.innerText = "Verifying Credentials...";
    btn.disabled = true;

    try {
        // A. Firebase Login (Directly with Email)
        await auth.signInWithEmailAndPassword(input, password);
        
        // B. If password is correct, start 2FA
        btn.innerText = "Sending OTP...";
        sendOTP(input);

    } catch (error) {
        console.error(error);
        
        // 🔒 SECURITY: Specific Error Messaging
        if (error.code === 'auth/user-not-found') {
            alert("Login Failed: This email is not registered.\nPlease go to the Register page.");
        } else if (error.code === 'auth/wrong-password') {
            alert("Login Failed: Incorrect Password.");
        } else if (error.code === 'auth/too-many-requests') {
            alert("Security Alert: Too many failed login attempts.\n\nYour account has been temporarily paused for security. Please try again in a few minutes.");
        } else if (error.code === 'auth/network-request-failed') {
            alert("Network Error: Please check your internet connection.");
        } else {
            alert(`Login Failed: ${error.message}`);
        }
        
        btn.innerText = "Login";
        btn.disabled = false;
    }
}

// ==========================================
// 3. OTP HANDLING (Direct EmailJS Integration)
// ==========================================
function sendOTP(email) {
    // 1. Generate 6-digit random number
    generatedOTP = Math.floor(100000 + Math.random() * 900000);
    
    // [SECURE] We do NOT log the OTP to console anymore

    const templateParams = {
        to_email: email,
        otp_code: String(generatedOTP),       
        time: new Date().toLocaleTimeString() 
    };

    const btn = document.querySelector('button');

    // 2. Send via EmailJS
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
        .then(function(response) {
            console.log('Email Sent Successfully!', response.status, response.text);
            showOTPModal(email); 
            
            // SECURITY: Set Sticky Cooldown (60s from now)
            const unlockTime = Date.now() + 60000;
            localStorage.setItem('otp_unlock_time', unlockTime);
            
            startCooldownUI(btn);
        })
        .catch(function(error) {
            console.error('FAILED...', error);
            alert(`Email Error: ${JSON.stringify(error)}`);
            if(btn) {
                btn.innerText = "Login";
                btn.disabled = false;
            }
        });
}

function showOTPModal(email) {
    const modal = document.getElementById('otpModal');
    const emailDisplay = document.getElementById('otpEmailDisplay');
    
    if(modal && emailDisplay) {
        emailDisplay.innerText = `Sent to: ${email}`;
        modal.style.display = 'flex';
    }
}

function closeOTPModal() {
    const modal = document.getElementById('otpModal');
    if(modal) modal.style.display = 'none';
    
    // If closed without verifying, sign out
    auth.signOut().then(() => {
        const btn = document.querySelector('#loginForm button');
        // Resume button timer if exists
        if (checkCooldown() <= 0 && btn) {
            btn.innerText = "Login";
            btn.disabled = false;
        } else if (btn) {
            startCooldownUI(btn); 
        }
    });
}

// ==========================================
// 4. VERIFY OTP
// ==========================================
function verifyOTP() {
    const userOtp = document.getElementById('otpInput').value;
    
    if (parseInt(userOtp) === generatedOTP) {
        // SUCCESS!
        sessionStorage.setItem('is2FAVerified', 'true');
        
        // Setup Auto-Logout Monitor
        initSessionMonitor();
        
        window.location.href = "index.html";
    } else {
        alert("Invalid OTP. Please try again.");
    }
}

// ==========================================
// 5. LOGOUT & SESSION MONITOR
// ==========================================
function logout() {
    sessionStorage.removeItem('is2FAVerified'); 
    localStorage.removeItem('otp_unlock_time'); 
    if (idleTimer) clearTimeout(idleTimer);
    
    auth.signOut().then(() => {
        window.location.href = "login.html";
    });
}

// SECURITY: Auto-Logout on Inactivity
function initSessionMonitor() {
    const resetTimer = () => {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            alert("Session Expired due to inactivity.");
            logout();
        }, IDLE_TIMEOUT_MS);
    };

    // Listen for activity
    window.onload = resetTimer;
    document.onmousemove = resetTimer;
    document.onkeypress = resetTimer;
    document.ontouchstart = resetTimer; 
}

// ==========================================
// 6. AUTH STATE LISTENER
// ==========================================
auth.onAuthStateChanged(async (user) => {
    const path = window.location.pathname;
    const isPublicPage = path.includes("login.html") || path.includes("register.html");
    const isVerified = sessionStorage.getItem('is2FAVerified') === 'true';

    // UI Elements
    const loginBtn = document.getElementById("login-btn");
    const userProfile = document.getElementById("user-profile");
    const userNameEl = document.getElementById("user-name");
    const userAvatarEl = document.getElementById("user-avatar");
    const userIdLabel = document.getElementById("user-id-label");
    const loginFormBtn = document.querySelector('#loginForm button');

    // On Load: Check if we are stuck in a cooldown
    if (isPublicPage && checkCooldown() > 0 && loginFormBtn) {
        startCooldownUI(loginFormBtn);
    }

    if (user) {
        console.log("User Auth Status: Logged In");

        if (!isVerified && !isPublicPage) {
            console.warn("2FA Not Verified. Redirecting to Login.");
            window.location.href = "login.html";
            return;
        }

        if (isVerified) {
            initSessionMonitor(); // Start monitoring

            if (loginBtn) loginBtn.style.display = "none";
            if (userProfile) userProfile.style.display = "flex";

            if (userNameEl && userIdLabel) {
                try {
                    const doc = await db.collection("users").doc(user.uid).get();
                    if (doc.exists) {
                        const data = doc.data();
                        userNameEl.innerText = data.fullName ? data.fullName.split(" ")[0] : "Student";
                        userAvatarEl.innerText = data.fullName ? data.fullName.charAt(0).toUpperCase() : "U";
                        userIdLabel.innerText = `ID: ${data.collegeId}`;
                    } else {
                        userNameEl.innerText = "User";
                        userIdLabel.innerText = user.email;
                    }
                } catch (error) {
                    console.error("Profile Load Error", error);
                }
            }

            if (isPublicPage) {
                window.location.href = "index.html";
            }
        }
    } else {
        console.log("User Auth Status: Signed Out");
        sessionStorage.removeItem('is2FAVerified');

        if (loginBtn) loginBtn.style.display = "block";
        if (userProfile) userProfile.style.display = "none";

        if (!isPublicPage && (path.includes("vote.html") || path.includes("results.html"))) {
             // window.location.href = "login.html"; 
        }
    }
});