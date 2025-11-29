/* js/auth.js */

/**
 * REGISTER NEW USER
 */
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

    // 1. Create User in Firebase Auth
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;

            // 2. Save User Details in Firestore
            return db.collection("users").doc(user.uid).set({
                fullName: fullName,
                collegeId: collegeId.toUpperCase(),
                email: email,
                hasVoted: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
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

/**
 * LOGIN USER
 */
async function loginUser() {
    const input = document.getElementById("loginInput").value.trim();
    const password = document.getElementById("password").value;

    if (!input || !password) {
        alert("Please fill in all fields.");
        return;
    }

    const btn = document.querySelector('button');
    btn.innerText = "Checking Credentials...";
    btn.disabled = true;

    try {
        let emailToLogin = input;

        // Smart Login: Check if input is ID or Email
        if (!input.includes("@")) {
            console.log("Looking up email for ID:", input);
            const snapshot = await db.collection("users")
                .where("collegeId", "==", input.toUpperCase())
                .get();

            if (snapshot.empty) {
                throw new Error("College ID not found. Please register first.");
            }
            emailToLogin = snapshot.docs[0].data().email;
        }

        await auth.signInWithEmailAndPassword(emailToLogin, password);
        window.location.href = "index.html";

    } catch (error) {
        console.error(error);
        alert("Login Failed: " + error.message);
        btn.innerText = "Login";
        btn.disabled = false;
    }
}

/**
 * LOGOUT FUNCTION
 */
function logout() {
    auth.signOut().then(() => {
        window.location.href = "login.html";
    });
}

/**
 * AUTH STATE LISTENER & UI UPDATER
 * This handles the Profile Pill and Dropdown population
 */
auth.onAuthStateChanged(async (user) => {
    const path = window.location.pathname;
    const isPublicPage = path.includes("login.html") || path.includes("register.html");

    // UI Elements
    const loginBtn = document.getElementById("login-btn");
    const userProfile = document.getElementById("user-profile");

    // Profile Data Elements
    const userNameEl = document.getElementById("user-name");
    const userAvatarEl = document.getElementById("user-avatar");
    const userIdLabel = document.getElementById("user-id-label");

    if (user) {
        // --- USER LOGGED IN ---
        console.log("User detected:", user.uid);

        // 1. Toggle UI Visibility
        if (loginBtn) loginBtn.style.display = "none";
        if (userProfile) userProfile.style.display = "flex";

        // 2. Fetch User Details from Firestore to populate Profile
        if (userNameEl && userIdLabel) {
            try {
                const doc = await db.collection("users").doc(user.uid).get();
                if (doc.exists) {
                    const data = doc.data();

                    // Update Name
                    userNameEl.innerText = data.fullName ? data.fullName.split(" ")[0] : "Student";

                    // Update Avatar (First Letter)
                    userAvatarEl.innerText = data.fullName ? data.fullName.charAt(0).toUpperCase() : "U";

                    // Update Dropdown ID
                    userIdLabel.innerText = `ID: ${data.collegeId}`;
                } else {
                    // Fallback if database record is missing (but user exists in Auth)
                    console.warn("User document missing in Firestore. Using Auth email.");
                    userNameEl.innerText = "User";
                    userIdLabel.innerText = user.email; // Show email if ID is missing
                }
            } catch (error) {
                console.error("Error fetching user profile:", error);
                userIdLabel.innerText = "Error loading data";
            }
        }

        // 3. Redirect if on Login/Register page
        if (isPublicPage) {
            window.location.href = "index.html";
        }

    } else {
        // --- USER LOGGED OUT ---
        console.log("No user logged in.");

        // 1. Toggle UI Visibility
        if (loginBtn) loginBtn.style.display = "block";
        if (userProfile) userProfile.style.display = "none";

        // 2. Protect Routes
        if (!isPublicPage && (path.includes("vote.html") || path.includes("results.html"))) {
            // window.location.href = "login.html"; // Uncomment to enforce login
        }
    }
});