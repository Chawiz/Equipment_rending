# 🏗️ Equipment Renting DApp - Complete Documentation

![Dashboard Preview](./screenshot-dashboard.png)
![Admin Panel Preview](./screenshot-admin.png)

## 📌 Table of Contents
1. [Project Overview](#-project-overview)
2. [Key Features](#-key-features)
3. [Technology Stack](#-technology-stack)
4. [Smart Contract Architecture](#-smart-contract-architecture)
5. [Frontend Structure](#-frontend-structure)
6. [Installation Guide](#-installation-guide)
7. [Configuration](#-configuration)
8. [Workflow Explanation](#-workflow-explanation)
9. [Testing Procedures](#-testing-procedures)
10. [Deployment Guide](#-deployment-guide)
11. [Security Measures](#-security-measures)
12. [Contributing](#-contributing)
13. [License](#-license)

## 🌐 Project Overview
This decentralized application (DApp) provides a blockchain-based solution for equipment rentals, featuring:

- Transparent rental agreements
- Secure payment handling via smart contracts
- Automated approval workflows
- Immutable record-keeping

**Core Problem Solved:** Eliminates trust issues in equipment rentals through blockchain transparency while automating payment and approval processes.

## ✨ Key Features

### User Features
| Feature | Description | Technical Implementation |
|---------|-------------|--------------------------|
| Request Creation | Users can request equipment with specifications | React Form → Smart Contract |
| Payment Handling | Automatic ETH calculation and processing | Ethers.js + Smart Contract Escrow |
| History Tracking | View all past/current rentals | Smart Contract Events + Frontend Cache |

### Admin Features
| Feature | Description | Technical Implementation |
|---------|-------------|--------------------------|
| Request Approval | Approve/reject incoming requests | Admin-only Smart Contract Function |
| Payment Management | Withdraw collected payments | Withdrawal Pattern Implementation |
| Analytics Dashboard | View rental statistics | TheGraph (optional) + Custom Charts |

## 🧩 Technology Stack

### Core Components
```mermaid
graph LR
    A[Frontend] --> B[Ethereum Blockchain]
    A --> C[IPFS]
    B --> D[Smart Contracts]
    D --> E[Payment Processing]
    D --> F[Access Control]
