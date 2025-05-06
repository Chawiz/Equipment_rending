const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; // Replace with your deployed address

const ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "_candidateName", "type": "string" }
    ],
    "name": "voteByName",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllCandidatesWithPositionNames",
    "outputs": [
      { "internalType": "string[]", "name": "candidateNames", "type": "string[]" },
      { "internalType": "string[]", "name": "positionNames", "type": "string[]" },
      { "internalType": "uint256[]", "name": "voteCounts", "type": "uint256[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "candidateCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

export { ABI, CONTRACT_ADDRESS };
