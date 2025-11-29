/* js/auth.js */

// ==========================================
// 🔧 CONFIGURATION 
// ==========================================
const EMAILJS_SERVICE_ID = "service_gr6vthl";   
const EMAILJS_TEMPLATE_ID = "template_r3t9j8l"; 

let generatedOTP = null; // Stores the code temporarily

// ==========================================
// 1. REGISTRATION
// ==========================================
function registerUser() {
    const fullName = document.getElementById("fullName").value;
    const collegeId = document.getElementById("regCollegeId").value;
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (!fullName || !collegeId || !email || !password || !confirmPassword) {
        alert("Please fill in all fields.");
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
            // C. Force Logout (User must login again to do 2FA)
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
// 2. LOGIN FLOW (Step 1: Check Password)
// ==========================================
async function loginUser() {
    const input = document.getElementById("loginInput").value.trim();
    const password = document.getElementById("password").value;

    if (!input || !password) {
        alert("Please fill in all fields.");
        return;
    }

    const btn = document.querySelector('button');
    btn.innerText = "Verifying Credentials...";
    btn.disabled = true;

    try {
        let emailToLogin = input;

        // Smart Resolve: If input is ID, find the Email
        if (!input.includes("@")) {
            // We keep this log as it's not sensitive, just process info
            console.log("Looking up email for ID:", input);
            const snapshot = await db.collection("users")
                .where("collegeId", "==", input.toUpperCase())
                .get();

            if (snapshot.empty) {
                throw new Error("College ID not found. Please register first.");
            }
            emailToLogin = snapshot.docs[0].data().email;
        }

        // A. Firebase Login (Checks Password)
        await auth.signInWithEmailAndPassword(emailToLogin, password);
        
        // B. If password is correct, start 2FA
        btn.innerText = "Sending OTP...";
        sendOTP(emailToLogin);

    } catch (error) {
        console.error(error);
        alert("Login Failed: " + error.message);
        btn.innerText = "Login";
        btn.disabled = false;
    }
}

// ==========================================
// 3. OTP HANDLING (Step 2: Send Email)
// ==========================================
function sendOTP(email) {
    // 1. Generate 6-digit random number
    generatedOTP = Math.floor(100000 + Math.random() * 900000);
    
    // [SECURE] Removed console.log of the OTP here

    // 2. Prepare Parameters
    const templateParams = {
        to_email: email,
        otp_code: String(generatedOTP),       
        time: new Date().toLocaleTimeString() 
    };

    const btn = document.querySelector('button');

    // 3. Send Email
    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
        .then(function(response) {
            console.log('Email Sent Successfully!', response.status, response.text);
            showOTPModal(email); 
        })
        .catch(function(error) {
            console.error('FAILED...', error);
            
            // Detailed Error for debugging
            alert(`Email Error: ${JSON.stringify(error)}\nCheck console for details.`);
            
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
    // If closed without verifying, log out immediately
    const modal = document.getElementById('otpModal');
    if(modal) modal.style.display = 'none';
    
    auth.signOut().then(() => {
        const btn = document.querySelector('#loginForm button');
        if(btn) {
            btn.innerText = "Login";
            btn.disabled = false;
        }
    });
}

// ==========================================
// 4. VERIFY OTP (Step 3: Check Code)
// ==========================================
function verifyOTP() {
    const userOtp = document.getElementById('otpInput').value;
    
    // Compare input with the generated number
    if (parseInt(userOtp) === generatedOTP) {
        // SUCCESS! Mark session as verified
        sessionStorage.setItem('is2FAVerified', 'true');
        window.location.href = "index.html";
    } else {
        alert("Invalid OTP. Please try again.");
    }
}

// ==========================================
// 5. LOGOUT
// ==========================================
function logout() {
    sessionStorage.removeItem('is2FAVerified'); // Clear 2FA flag
    auth.signOut().then(() => {
        window.location.href = "login.html";
    });
}

// ==========================================
// 6. AUTH STATE LISTENER (The Brain)
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

    if (user) {
        // --- USER IS AUTHENTICATED ---
        console.log("User Auth Status: Logged In");

        // SECURITY: If not 2FA verified, stay on login page or redirect there
        if (!isVerified && !isPublicPage) {
            console.warn("2FA Not Verified. Redirecting to Login.");
            window.location.href = "login.html";
            return;
        }

        // If Verified, Update UI
        if (isVerified) {
            if (loginBtn) loginBtn.style.display = "none";
            if (userProfile) userProfile.style.display = "flex";

            // Fetch Profile Data for Navbar
            if (userNameEl && userIdLabel) {
                try {
                    const doc = await db.collection("users").doc(user.uid).get();
                    if (doc.exists) {
                        const data = doc.data();
                        userNameEl.innerText = data.fullName ? data.fullName.split(" ")[0] : "Student";
                        userAvatarEl.innerText = data.fullName ? data.fullName.charAt(0).toUpperCase() : "U";
                        userIdLabel.innerText = `ID: ${data.collegeId}`;
                    } else {
                        // Fallback if DB record missing
                        userNameEl.innerText = "User";
                        userIdLabel.innerText = user.email;
                    }
                } catch (error) {
                    console.error("Profile Load Error", error);
                }
            }

            // If on login page but verified, go to dashboard
            if (isPublicPage) {
                window.location.href = "index.html";
            }
        }
    } else {
        // --- USER IS LOGGED OUT ---
        console.log("User Auth Status: Signed Out");
        sessionStorage.removeItem('is2FAVerified');

        if (loginBtn) loginBtn.style.display = "block";
        if (userProfile) userProfile.style.display = "none";

        // Protect Dashboard Routes
        if (!isPublicPage && (path.includes("vote.html") || path.includes("results.html"))) {
             // window.location.href = "login.html"; // Uncomment to enforce strict security
        }
    }
});