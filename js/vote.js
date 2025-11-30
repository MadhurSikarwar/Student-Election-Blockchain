/* js/vote.js */

/**
 * CAST VOTE FUNCTION (Hybrid: Blockchain + Database)
 */
async function castVote(candidateId, candidateName) {
    
    // 1. Check Authentication (Firebase)
    const user = auth.currentUser;
    if (!user) {
        alert("Please login to vote.");
        window.location.href = "login.html";
        return;
    }

    // 2. Ensure Web3 is ready
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            userAccount = accounts[0];
            
            if (!electionContract) {
                await loadWeb3();
            }
        } catch (error) {
            alert("MetaMask Connection Failed. Please try again.");
            return;
        }
    } else {
        alert("MetaMask not found! Please install it.");
        return;
    }

    // 3. Confirm Intent
    const confirmVote = confirm(`Confirm vote for ${candidateName}?\n\n1. Click OK.\n2. MetaMask will open.\n3. Click 'Confirm' to pay the gas fee.`);
    if (!confirmVote) return;

    // UI Feedback
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.disabled = true;
        btn.innerText = "Check MetaMask...";
    });

    try {
        console.log(`[Web3] Voting for ID: ${candidateId} from ${userAccount}`);
        
        // ------------------------------------------------
        // 4. BLOCKCHAIN TRANSACTION (Primary Record)
        // ------------------------------------------------
        await electionContract.methods.vote(candidateId).send({ from: userAccount });

        console.log("[Web3] Transaction Successful!");

        // ------------------------------------------------
        // 5. FIREBASE UPDATE (User Status Only)
        // ------------------------------------------------
        // FIX: We use .set({merge: true}) instead of .update()
        // This ensures it works even if the user profile was missing in the database.
        const userRef = db.collection("users").doc(user.uid);

        await userRef.set({ 
            hasVoted: true,
            votedTxHash: "Confirmed on Blockchain", 
            votedAt: firebase.firestore.FieldValue.serverTimestamp(),
            // We verify the email exists to be safe, defaulting to Auth email if missing in DB
            email: user.email 
        }, { merge: true });

        // 6. Success
        alert(`✅ VOTE SUCCESSFUL!\n\nRecorded on Blockchain.`);
        window.location.href = "results.html";

    } catch (error) {
        console.error("Voting Failed:", error);
        
        if (error.code === 4001) {
            alert("Transaction Cancelled: You rejected the request in MetaMask.");
        } else if (error.message && error.message.includes("revert")) {
            alert("Vote Rejected!\n\nReason: This Wallet Address has ALREADY voted.");
        } else if (error.message && error.message.includes("Internal JSON-RPC error")) {
            alert("Ganache Error!\n\nFix:\n1. Open MetaMask\n2. Settings -> Advanced -> Clear activity data\n3. Try again.");
        } else {
            alert("Technical Error: " + error.message);
        }

        // Reset Buttons
        buttons.forEach(btn => {
            btn.disabled = false;
            btn.innerText = "Vote";
        });
    }
}

// Auto-load on page start
window.addEventListener('load', async () => {
    setTimeout(async () => {
        await loadWeb3();
    }, 500);
});