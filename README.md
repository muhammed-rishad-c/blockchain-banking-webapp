# 💸 ChainFlow: Blockchain-Based Banking Web App

ChainFlow is a secure, full-stack financial services platform that integrates a custom **Proof of Work (PoW) Blockchain** for immutable transaction logging. The application allows users to perform P2P transfers, pay bills, and manage their finances while ensuring top-tier security through cryptographic hashing and multi-factor authentication.

## 🚀 Key Features

### 🔐 Security & Authentication
* **Cryptographic Security**: Implements `bcrypt` with 10 salt rounds for secure password and UPI PIN hashing.
* **Role-Based Access**: Uses Express-session middleware to manage user sessions and verify login status for sensitive operations.
* **PIN-Verified Transactions**: Requires a hashed 4-digit PIN for viewing balances and completing payments.

### ⛓️ Custom Blockchain Integration
* **Immutable Ledger**: Every transaction is recorded on a private blockchain to ensure data integrity.
* **Proof of Work (PoW)**: Features a SHA-256 mining algorithm with a four-zero difficulty target (`0000`) to validate blocks.
* **Dynamic Hashing**: Uses `crypto` to generate hashes based on the previous block's hash, current transaction data, and a nonce.

### 💳 Financial Services
* **P2P Transfers**: Secure fund transfers between users using a unique `@chainflow` UPI ID system.
* **Comprehensive Bill Payments**: Integrated modules for **Mobile Recharge**, **Electricity Bills**, **Water Bills**, and **Bank Transfers**.
* **Real-time Balance Management**: Instant balance updates via a dual-ledger transaction model utilizing PostgreSQL transactions for atomicity.

### 📊 History & Search
* **Transaction History**: Detailed logs showing sender/recipient names, amounts, transaction types, and timestamps.
* **Global Search**: Search functionality to find specific user transaction histories within the network.

## 🛠️ Tech Stack

* **Backend**: Node.js, Express.js
* **Database**: PostgreSQL (Relational data & Transactional logs)
* **Blockchain**: Custom JavaScript implementation (SHA-256)
* **Frontend**: EJS (Embedded JavaScript Templates)
* **Security**: Bcrypt (Hashing), Express-Session (Authentication)
* **File Handling**: Multer (User Profile Photo Uploads)

## 📂 Project Structure

```text
├── blockchain/
│   └── block.js        # Core Blockchain logic & PoW algorithm
├── helper/
│   └── database.js     # PostgreSQL queries and transactional helpers
├── public/
│   └── uploads/        
├── views/              # EJS templates for UI
└── index.js            # Main application entry point & API routes

