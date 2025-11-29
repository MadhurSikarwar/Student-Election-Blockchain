// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Election {

    // --- MODEL A CANDIDATE ---
    struct Candidate {
        uint id;
        string name;
        uint voteCount;
    }

    // --- STORE ACCOUNTS THAT HAVE VOTED ---
    mapping(address => bool) public voters;

    // --- STORE CANDIDATES ---
    // Fetch Candidate by ID
    mapping(uint => Candidate) public candidates;
    
    // Store Candidates Count
    uint public candidatesCount;

    // --- EVENT FOR FRONTEND UPDATES ---
    event votedEvent (
        uint indexed _candidateId
    );

    // --- CONSTRUCTOR ---
    constructor() {
        addCandidate("Alex Reynolds");
        addCandidate("Sarah Jenkins");
        addCandidate("Mike Thompson");
    }

    // --- PRIVATE FUNCTION TO ADD CANDIDATES ---
    function addCandidate (string memory _name) private {
        candidatesCount ++;
        candidates[candidatesCount] = Candidate(candidatesCount, _name, 0);
    }

    // --- VOTE FUNCTION ---
    function vote (uint _candidateId) public {
        
        // 1. Require that they haven't voted before
        require(!voters[msg.sender], "Address has already voted.");

        // 2. Require a valid candidate
        require(_candidateId > 0 && _candidateId <= candidatesCount, "Invalid candidate ID.");

        // 3. Record that voter has voted
        voters[msg.sender] = true;

        // 4. Update candidate vote Count
        candidates[_candidateId].voteCount ++;

        // 5. Trigger voted event
        emit votedEvent(_candidateId);
    }
}