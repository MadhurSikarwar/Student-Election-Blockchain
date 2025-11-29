/* js/vote.js */

/**
 * CAST VOTE FUNCTION
 * Uses a Firebase Transaction to ensure integrity.
 */
async function castVote(candidateId, candidateName) {
    
    // 1. Check if user is logged in
    const user = auth.currentUser;
    
    if (!user) {
        alert("You must be logged in to vote!");
        window.location.href = "login.html";
        return;
    }

    const confirmVote = confirm(`Are you sure you want to vote for ${candidateName}?\nThis action cannot be undone.`);
    if (!confirmVote) return;

    // UI Feedback
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.disabled = true;
        btn.innerText = "Processing...";
    });

    // 2. Define References
    const userRef = db.collection("users").doc(user.uid);
    // Note: Ensure you have a 'candidates' collection. IDs should match 1, 2, 3 strings or numbers.
    // We convert ID to string to use as Document ID
    const candidateRef = db.collection("candidates").doc(String(candidateId));

    try {
        await db.runTransaction(async (transaction) => {
            
            // A. READ: Get the fresh user data
            const userDoc = await transaction.get(userRef);
            
            if (!userDoc.exists) {
                throw "User data not found.";
            }

            // B. CHECK: Has the user already voted?
            if (userDoc.data().hasVoted) {
                throw "You have ALREADY voted. Double voting is not allowed.";
            }

            // C. WRITE: Update Candidate Count & User Status
            // We use 'increment' so we don't need to read the candidate count first
            transaction.set(candidateRef, { 
                name: candidateName,
                voteCount: firebase.firestore.FieldValue.increment(1) 
            }, { merge: true });

            transaction.update(userRef, { 
                hasVoted: true,
                votedFor: candidateId, // Optional: tracking
                votedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        // 3. Success
        alert(`✅ Success! \n\nYour vote for ${candidateName} has been recorded.`);
        window.location.href = "results.html";

    } catch (error) {
        console.error("Voting failed:", error);
        
        // Handle specific double-vote error vs network error
        if (typeof error === "string" && error.includes("ALREADY")) {
            alert("⚠️ Security Alert: " + error);
        } else {
            alert("Transaction failed. Please try again.");
        }

        // Reset buttons
        buttons.forEach(btn => {
            btn.disabled = false;
            btn.innerText = "Vote";
        });
    }
}