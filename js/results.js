/* js/results.js - DEBUG VERSION */

// Global variable to store fetched data
let electionData = {
    totalVotes: 0,
    candidates: []
};

/**
 * INITIALIZE RESULTS PAGE
 */
window.addEventListener('load', async () => {
    console.log("Initializing Blockchain Connection...");
    
    // 1. Wait for Web3 to load
    const connected = await loadWeb3();
    if (!connected) {
        document.querySelector('.results-header p').innerText = "Error: Could not connect to Blockchain.";
        return;
    }

    // DIAGNOSTIC: Verify Connection
    console.log("---------------------------------------");
    console.log("[DIAGNOSTIC] Web3 Status:");
    console.log("• Connected Account:", userAccount);
    console.log("• Contract Address:", contractAddress);
    
    if (electionContract) {
        // Check if the blockchain thinks THIS user has voted
        try {
            const hasVoted = await electionContract.methods.voters(userAccount).call();
            console.log("• Has this account voted?", hasVoted);
            if (hasVoted) {
                console.log("  (The blockchain knows you voted. If counts are 0, check Candidate IDs)");
            } else {
                console.log("  (The blockchain thinks you have NOT voted yet)");
            }
        } catch (e) {
            console.error("• Could not read voter status:", e);
        }
    }
    console.log("---------------------------------------");

    // 2. Fetch Initial Data immediately
    await fetchElectionResults();

    // 3. Listen for future votes (Real-time updates)
    if (electionContract) {
        listenForVotes();
    }
});

/**
 * FETCH DATA FROM SMART CONTRACT
 */
async function fetchElectionResults() {
    if (!electionContract) return;

    const loaderBtn = document.querySelector('.refresh-container .btn');
    if(loaderBtn) loaderBtn.innerText = "Loading from Blockchain...";

    try {
        // A. Get Total Candidate Count
        const countStr = await electionContract.methods.candidatesCount().call();
        const candidatesCount = parseInt(countStr);
        
        console.log(`[Debug] Total Candidates Count in Contract: ${candidatesCount}`);

        electionData.candidates = [];
        electionData.totalVotes = 0;

        if (candidatesCount === 0) {
            console.warn("[Debug] Warning: Contract has 0 candidates. Did you deploy the correct contract?");
        }

        // B. Loop through each candidate
        for (let i = 1; i <= candidatesCount; i++) {
            const candidate = await electionContract.methods.candidates(i).call();
            
            // Log raw data to see what the blockchain is sending
            // console.log(`[Raw Data] Candidate ${i}:`, candidate);

            const votes = parseInt(candidate.voteCount);
            
            electionData.candidates.push({
                id: parseInt(candidate.id),
                name: candidate.name,
                votes: votes
            });

            electionData.totalVotes += votes;
        }
        
        console.log("[Debug] Final Parsed Data:", electionData);

        // C. Update the UI
        updateDashboard();
        
        if(loaderBtn) loaderBtn.innerText = "Refresh Data ↻";

    } catch (error) {
        console.error("Error fetching results:", error);
        // Alert helpful hints if reading fails
        if (error.message && error.message.includes("call")) {
            console.error("This usually means the Contract Address in js/web3-config.js does not match the deployed contract in Ganache.");
        }
    }
}

/**
 * UPDATE DOM ELEMENTS
 */
function updateDashboard() {
    // Update Total Counter
    const totalEl = document.getElementById('total-votes');
    if(totalEl) totalEl.innerText = electionData.totalVotes;

    // Update Each Candidate Bar
    electionData.candidates.forEach(candidate => {
        const countId = `count-${candidate.id}`;
        const barId = `bar-${candidate.id}`;
        
        // Calculate Percentage
        const percentage = electionData.totalVotes > 0 
            ? ((candidate.votes / electionData.totalVotes) * 100).toFixed(1) 
            : 0;

        // Update Text
        const countEl = document.getElementById(countId);
        if (countEl) countEl.innerText = `${candidate.votes} Votes`;

        // Update Bar Width & Label
        const barEl = document.getElementById(barId);
        if (barEl) {
            // Force a small delay to allow CSS transition to render
            setTimeout(() => {
                barEl.style.width = `${percentage}%`;
            }, 100);
            
            const percentText = barEl.querySelector('.percentage');
            if(percentText) percentText.innerText = `${percentage}%`;
        }
    });
}

/**
 * LISTEN FOR BLOCKCHAIN EVENTS
 */
function listenForVotes() {
    // Subscribe to the "votedEvent"
    electionContract.events.votedEvent({}, (error, event) => {
        if (error) {
            console.error("Event Error:", error);
            return;
        }
        console.log("⚡ New Vote Detected on Blockchain!", event);
        fetchElectionResults();
    });
}

/**
 * Manual Refresh Button
 */
function refreshResults() {
    fetchElectionResults();
}