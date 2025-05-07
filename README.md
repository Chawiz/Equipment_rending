# Equipment Lending DApp

![Dashboard Preview](./screenshots/dashboard.png)
![Admin Panel Preview](./screenshots/admin.png)

## 📌 Table of Contents
- [Project Overview](#-project-overview)
- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [Smart Contract Architecture](#-smart-contract-architecture)
- [Frontend Structure](#-frontend-structure)
- [Installation Guide](#-installation-guide)
- [Configuration](#-configuration)
- [Workflow Explanation](#-workflow-explanation)
- [Testing Procedures](#-testing-procedures)
- [Deployment Guide](#-deployment-guide)
- [Security Measures](#-security-measures)
- [Contributing](#-contributing)
- [License](#-license)

## 🌐 Project Overview
This decentralized application (DApp) provides a blockchain-based solution for equipment rentals, featuring:

- Transparent rental agreements
- Secure payment handling via smart contracts
- Automated approval workflows
- Immutable record-keeping

**Core Problem Solved**: Eliminates trust issues in equipment rentals through blockchain transparency while automating payment and approval processes.

## ✨ Key Features

### User Features
| Feature | Description | Technical Implementation |
|---------|-------------|--------------------------|
| Request Creation | Users can request equipment with specifications | React Form → Smart Contract Function |
| Payment Handling | Automatic ETH calculation and processing | Ethers.js + Smart Contract Escrow |
| History Tracking | View all past/current rentals | Smart Contract Events + Frontend Cache |
| Return Management | Initiate equipment returns | Status-based Smart Contract Transition |

### Admin Features
| Feature | Description | Technical Implementation |
|---------|-------------|--------------------------|
| Request Approval | Approve/reject incoming requests | Admin-only Smart Contract Function |
| Equipment Management | CRUD operations for inventory | Ownable Contract Pattern |
| Payment Withdrawal | Withdraw collected payments | Withdrawal Pattern Implementation |
| Status Moderation | Update request states | Finite State Machine in Smart Contract |

## 🧩 Technology Stack

### Core Components
| Layer | Technology | Purpose |
|-------|------------|---------|
| Blockchain | Ethereum (Local/Hardhat) | Smart Contract Execution |
| Frontend | React.js (v18) | User Interface |
| Styling | Bootstrap 5 + CSS Modules | Responsive Design |
| State Management | React Context API | Application State |
| Web3 Integration | Ethers.js (v6) | Blockchain Interactions |
| Testing | Hardhat + Chai | Smart Contract Tests |

### Smart Contract Architecture
```solidity
EquipmentLending.sol
├── Ownable
├── Equipment Struct
│   ├── uint256 id
│   ├── string name
│   ├── uint256 quantity
│   ├── uint256 dailyPrice
│   ├── bool isAvailable
├── Request Struct
│   ├── uint256 equipmentId
│   ├── address borrower
│   ├── uint256 requestDate
│   ├── uint256 dueDate
│   ├── uint256 status // 0=Pending, 1=Approved, etc.
├── Key Functions
│   ├── addEquipment()
│   ├── requestEquipment() → payable
│   ├── processRequest() → admin-only
│   └── confirmReturn() → admin-only
