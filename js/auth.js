/* js/auth.js */

/**
 * Simulates user login
 * In a real app, this would verify credentials against a backend or blockchain wallet.
 */
function loginUser() {
    const collegeId = document.getElementById("collegeId").value;
    const password = document.getElementById("password").value;

    if (!collegeId || !password) {
        alert("Please fill in all fields.");
        return;
    }

    // Simulate API delay
    const btn = document.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = "Authenticating...";
    btn.disabled = true;

    setTimeout(() => {
        // Mock success logic
        alert("Login Successful! Welcome, " + collegeId);
        window.location.href = "index.html"; // Redirect to dashboard
    }, 1000);
}

/**
 * Simulates user registration
 */
function registerUser() {
    const fullName = document.getElementById("fullName").value;
    const collegeId = document.getElementById("regCollegeId").value;
    const password = document.getElementById("regPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Basic Validation
    if (!fullName || !collegeId || !password || !confirmPassword) {
        alert("Please fill in all fields.");
        return;
    }

    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    // Simulate API delay
    const btn = document.querySelector('button');
    btn.innerText = "Registering...";
    btn.disabled = true;

    setTimeout(() => {
        console.log("Registered:", { fullName, collegeId });
        alert("Registration Successful! Please login.");
        window.location.href = "login.html"; // Redirect to login
    }, 1000);
}