/* js/results.js */

/**
 * INITIALIZE RESULTS LISTENER
 * Connects to Firestore and updates graphs in real-time
 */
function initResults() {
    console.log("Connecting to Live Election Ledger...");

    const candidatesRef = db.collection("candidates");

    // Listen for real-time updates
    candidatesRef.onSnapshot((snapshot) => {
        
        let totalVotes = 0;
        let candidateData = {};

        // 1. First Pass: Calculate Total Votes
        snapshot.forEach((doc) => {
            const data = doc.data();
            const votes = data.voteCount || 0;
            
            candidateData[doc.id] = votes;
            totalVotes += votes;
        });

        // Update Total Counter
        document.getElementById('total-votes').innerText = totalVotes;

        // 2. Second Pass: Update UI Bars
        // IDs must match the button IDs in vote.html (1, 2, 3)
        [1, 2, 3].forEach(id => {
            const votes = candidateData[id] || 0; // Default to 0 if no votes yet
            
            // Avoid division by zero
            const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : 0;

            const countId = `count-${id}`;
            const barId = `bar-${id}`;

            // Update Text
            const countEl = document.getElementById(countId);
            if (countEl) countEl.innerText = `${votes} Votes`;

            // Update Bar Width & Label
            const barEl = document.getElementById(barId);
            if (barEl) {
                barEl.style.width = `${percentage}%`;
                const percentText = barEl.querySelector('.percentage');
                if(percentText) percentText.innerText = `${percentage}%`;
            }
        });

    }, (error) => {
        console.error("Error getting results:", error);
    });
}

// Start listening when page loads
window.addEventListener('DOMContentLoaded', () => {
    initResults();
});