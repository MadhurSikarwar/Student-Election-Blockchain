/* js/results.js */

// Mock Data - In a real app, this comes from the Blockchain
const mockElectionData = {
    candidates: [
        { id: 1, name: "Alex Reynolds", votes: 450 },
        { id: 2, name: "Sarah Jenkins", votes: 180 },
        { id: 3, name: "Mike Thompson", votes: 70 }
    ],
    totalVotes: 700
};

/**
 * Main function to load and display results
 */
function refreshResults() {
    console.log("Fetching live data from blockchain node...");

    // TODO: Connect to Web3 to get real counts
    // const results = await contract.methods.getResults().call();
    
    // Simulate network delay for effect
    const btn = document.querySelector('.btn-secondary');
    if(btn) btn.innerText = "Refreshing...";
    
    setTimeout(() => {
        updateDashboard(mockElectionData);
        if(btn) btn.innerText = "Refresh Data ↻";
    }, 800);
}

/**
 * Updates the DOM elements with the calculated data
 */
function updateDashboard(data) {
    document.getElementById('total-votes').innerText = data.totalVotes;

    data.candidates.forEach(candidate => {
        const countId = `count-${candidate.id}`;
        const barId = `bar-${candidate.id}`;
        
        // Calculate Percentage
        const percentage = ((candidate.votes / data.totalVotes) * 100).toFixed(1);

        // Update Text
        const countEl = document.getElementById(countId);
        if (countEl) countEl.innerText = `${candidate.votes} Votes`;

        // Update Bar Width & Label
        const barEl = document.getElementById(barId);
        if (barEl) {
            barEl.style.width = `${percentage}%`;
            barEl.querySelector('.percentage').innerText = `${percentage}%`;
        }
    });
}

// Initialize on Page Load with animation
window.addEventListener('DOMContentLoaded', () => {
    // 1. Reset bars to 0 for animation effect
    [1, 2, 3].forEach(id => {
        const bar = document.getElementById(`bar-${id}`);
        if(bar) bar.style.width = '0%';
    });

    // 2. Trigger data load after slight delay
    setTimeout(() => {
        refreshResults();
    }, 100);
});