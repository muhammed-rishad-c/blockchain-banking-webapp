# ChainFlex: A Dual-Ledger Financial Transaction Hub



ChainFlex is a full-stack web application built on the MERN stack that simulates a modern financial ecosystem on a decentralized ledger. It features a unique **dual-ledger system** that supports both transparent **Global** transactions and confidential **Private** transactions, mimicking real-world financial privacy needs.

## 📖 Table of Contents
* [Key Features](#-key-features)
* [System Architecture](#-system-architecture)
* [Technology Stack](#-technology-stack)
* [Getting Started](#-getting-started)
  * [Prerequisites](#prerequisites)
  * [Backend Setup](#backend-setup-server)
  * [Frontend Setup](#frontend-setup-client)
* [How to Use](#-how-to-use)
* [API Endpoints](#-api-endpoints)
* [License](#-license)
* [Contact](#-contact)

## ✨ Key Features

### 1. Dual Transaction Ledger System

This is the core feature of the application, providing users with flexibility and control over their transaction privacy.

* **🌍 Global Ledger:** Functions like a traditional public blockchain. All transactions posted here are transparent, immutable, and visible to every participant on the network. Ideal for auditable, open transactions.
* **🔒 Private Ledger:** Designed for confidentiality. Transactions made in this mode are only visible to the sender and the receiver. The transaction details are stored off-chain or in a permissioned manner, while a proof or hash of the transaction might be anchored to the main chain for integrity.

### 2. Real-World Transaction Simulation

Users can perform a variety of transactions, each with its own category, making the simulation feel like a genuine fintech application.
* **🏦 Bank Transaction:** Standard transfers between user accounts.
* **💳 UPI Transaction:** Mimics instant, real-time payment systems.
* **🧾 Bill Payment:** Allows users to simulate paying utility bills.
* **📱 Mobile Recharge:** A feature to simulate topping up a mobile phone balance.

### 3. Secure User Authentication
* User registration and login system using JSON Web Tokens (JWT) for secure and stateless authentication.

### 4. Integrated Database
* **PostgreSQL** is used to manage user accounts, profiles, and private transaction metadata, ensuring fast and reliable data retrieval for a smooth user experience.
* The blockchain ledger itself is managed by the Node.js backend, with blocks and public transactions likely stored in **MongoDB** (as per MERN) or a file-based system to ensure immutability.

## 🛠️ System Architecture

The application follows a client-server model with a clear separation of concerns.

1.  **Frontend (Client):** A responsive user interface built with **React**. It handles user interactions, displays wallet balances, transaction histories, and provides forms for initiating new transactions. It communicates with the backend via a REST API.

2.  **Backend (Server):** A robust API built with **Node.js** and **Express.js**. It manages:
    * User authentication and authorization.
    * Business logic for all transaction types.
    * Interaction with the PostgreSQL database for user-related data.
    * Managing the blockchain logic: creating blocks, validating chains, and broadcasting transactions.

3.  **Database (PostgreSQL):** Serves as the primary database for relational data like user profiles, account details, and references to private transactions. This provides the "localhost smoothing" by offloading queries that don't need to be on the immutable ledger.

## 🚀 Technology Stack

* **Frontend:** React, Redux (or Context API), Axios, CSS/TailwindCSS
* **Backend:** Node.js, Express.js
* **Database:** PostgreSQL (for user data), MongoDB (for blockchain data)
* **Authentication:** JSON Web Tokens (JWT), bcrypt.js
* **Blockchain Core:** Custom logic using crypto libraries like `crypto-js` or `js-sha256`.

## ⚙️ Getting Started

Follow these instructions to set up and run the project on your local machine.

### Prerequisites

* Node.js (v14 or later)
* npm or yarn
* PostgreSQL installed and running on your machine.

### Backend Setup (Server)

1.  **Navigate to the server directory:**
    ```bash
    cd server
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up the environment variables:**
    Create a `.env` file in the `server` directory and add the following, replacing the values with your local PostgreSQL and JWT configuration.
    ```env
    # PostgreSQL Configuration
    PG_USER=your_postgres_user
    PG_HOST=localhost
    PG_DATABASE=your_db_name
    PG_PASSWORD=your_postgres_password
    PG_PORT=5432

    # JWT Secret
    JWT_SECRET=a_very_strong_and_secret_key
    ```

4.  **Set up the database:**
    Connect to PostgreSQL and create a database. Then, run the provided SQL script to create the necessary tables.
    ```bash
    psql -U your_postgres_user -d your_db_name -f database.sql
    ```

5.  **Start the backend server:**
    ```bash
    npm start
    ```
    The server will be running on `http://localhost:5000` (or your configured port).

### Frontend Setup (Client)

1.  **Navigate to the client directory from the root folder:**
    ```bash
    cd client
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up the environment variables:**
    Create a `.env` file in the `client` directory to specify the backend API endpoint.
    ```env
    REACT_APP_API_URL=http://localhost:5000
    ```

4.  **Start the frontend application:**
    ```bash
    npm start
    ```
    The React development server will open the app in your browser at `http://localhost:3000`.

## 👨‍💻 How to Use

1.  **Register a New Account:** Open the app in your browser and create a new user account.
2.  **Login:** Log in to access your dashboard.
3.  **View Your Dashboard:** Your dashboard will show your current balance and separate views for the Global and Private transaction ledgers.
4.  **Perform a Transaction:**
    * Click on "New Transaction".
    * Select the transaction type (e.g., Bank Transfer, Bill Payment).
    * Enter the recipient's details and the amount.
    * **Choose the ledger mode: "Global" (public) or "Private" (confidential).**
    * Submit the transaction.
5.  **Verify:** The transaction will appear in the corresponding ledger on your dashboard. If it was a Global transaction, other users will also see it on their Global ledger.

## 🔌 API Endpoints

A brief overview of the main API routes:

* `POST /api/users/register`: Register a new user.
* `POST /api/users/login`: Log in an existing user.
* `GET /api/transactions/global`: Fetch all transactions from the Global ledger.
* `GET /api/transactions/private`: Fetch private transactions for the logged-in user.
* `POST /api/transactions/create`: Create a new transaction (payload specifies mode and type).

## 📄 License

This project is distributed under the MIT License. See the `LICENSE` file for more information.

## 📞 Contact

Muhammed Rishad c - `[muhammed.risshad@gmail.com]`

Project Link: `[https://github.com/muhammed-rishad-c/blockchain-banking-webapp]`
