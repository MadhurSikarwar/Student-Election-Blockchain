/* js/vote.js */

/**
 * Handles the voting process when a "Vote" button is clicked.
 * @param {number} candidateId - The ID of the candidate
 * @param {string} candidateName - The name of the candidate
 */
async function castVote(candidateId, candidateName) {
    
    // 1. Check Local Storage to simulate "One Person, One Vote"
    if (localStorage.getItem("hasVoted") === "true") {
        alert("⚠️ You have already cast your vote! \n\nBlockchain records are immutable.");
        return;
    }

    // 2. Confirm the action
    const confirmVote = confirm(`Are you sure you want to vote for ${candidateName}?\nThis action cannot be undone.`);
    
    if (!confirmVote) return;

    // 3. UI Feedback - Simulate loading state
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.disabled = true;
        btn.innerText = "Processing...";
    });

    try {
        console.log(`Initiating transaction for Candidate ID: ${candidateId}...`);

        // TODO: Replace this timeout with actual Web3/Smart Contract call
        // Example: await contract.methods.vote(candidateId).send({ from: userAccount });
        
        await new Promise(resolve => setTimeout(resolve, 1500)); // Fake network delay

        // 4. Success Handling
        localStorage.setItem("hasVoted", "true");
        localStorage.setItem("votedFor", candidateName); // Optional: remember who they voted for

        alert(`✅ Success! \n\nYour vote for ${candidateName} has been recorded on the ledger.`);
        
        // 5. Redirect to Results
        window.location.href = "results.html";

    } catch (error) {
        console.error("Voting failed:", error);
        alert("Transaction failed. Please try again.");
        
        // Reset buttons on failure
        buttons.forEach(btn => {
            btn.disabled = false;
            btn.innerText = "Vote";
        });
    }
}