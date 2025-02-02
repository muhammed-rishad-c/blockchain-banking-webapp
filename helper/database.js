import { resourceLimits } from 'worker_threads';
import db from '../database/db.js';
import { log } from 'console';
import { runInNewContext } from 'vm';
import { resolve } from 'path';
import Blockchain from '../blockchain/block.js';

const blockchain = new Blockchain();

const helpers = {
    addUser: (details, photo) => {
        const { username, phone, password, fullname } = details;
        return new Promise(async (resolve, reject) => {
            try {
                const query = `insert into users (userName, phoneNumber, photo, pasword, full_name) values ($1, $2, $3, $4, $5)`;
                const values = [username, phone, photo, password, fullname];

                await db.query(query, values);
                resolve(true);
            } catch (e) {
                console.log(e);
            }
        })
    },
    setUpiId: (username) => {
        const upid = `${username}@chainflow`;
        return new Promise(async (resolve, reject) => {
            const query = `UPDATE users SET upid = $1 WHERE username = $2`;
            const values = [upid, username];
            const query1 = `insert into balance (upid, balance) values ($1, $2)`;
            const values1 = [upid, 0];
            try {
                await db.query(query, values);
                await db.query(query1, values1);
                resolve(true);
            } catch (e) {
                console.log("error in adding upi id " + e);
            }
        })
    },
    setPin: (hashedPin, upid) => {
        return new Promise(async (resolve, reject) => {
            const query = `Update users SET pin = $1 WHERE upid=$2`;
            const values = [hashedPin, upid];
            try {
                await db.query(query, values);
                resolve(true);
            } catch (e) {
                console.log("error at entering upidid " + e);
            }
        })
    },
    getUserDetail: (upid) => {
        return new Promise(async (resolve, reject) => {
            const query = `select * from users where upid=$1`;
            const values = [upid];
            try {
                const result = await db.query(query, values);
                const detail = result.rows.map(element => ({
                    id: element.id,
                    username: element.username,
                    phonenumber: element.phonenumber,
                    photo: element.photo,
                    upid: element.upid,
                    fullname: element.full_name,
                    pin: element.pin
                }));
                resolve(detail);
            } catch (e) {
                console.log(e);
                reject(e);
            }
        })
    },
    isUser: (username) => {
        return new Promise(async (resolve, reject) => {
            const query = 'SELECT * FROM users WHERE username = $1';
            const values = [username];
            try {
                const result = await db.query(query, values);
                if (result.rows.length > 0) {
                    resolve(result.rows[0]);
                } else {
                    resolve(null);
                    console.log('Login failed: user is not registered');
                }
            } catch (e) {
                reject(e);
                console.log('Error in checking user login:', e);
            }
        });
    },
    getUser: (username) => {
        return new Promise(async (resolve, reject) => {
            const query = 'SELECT * FROM users WHERE username = $1';
            const values = [username];
            try {
                const result = await db.query(query, values);
                if (result.rows.length > 0) {
                    resolve(result.rows[0]);
                } else {
                    resolve(null);
                    console.log('User not found');
                }
            } catch (error) {
                reject(error);
                console.log('Error fetching user details:', error);
            }
        });
    },
    getBalance: (upid) => {
        return new Promise(async (resolve, reject) => {
            const query = `select balance from balance where upid=$1`;
            const values = [upid];
            try {
                const result = await db.query(query, values);
                const balance = result.rows[0];
                resolve(balance);
            } catch (e) {
                reject(e);
                console.log("error in occuring balance ");
            }
        })
    },
    addTransaction: (detail, sender) => {
        const { recipient, amount, type } = detail;
        const recipientupi = `${recipient}@chainflow`;
        return new Promise(async (resolve, reject) => {
            const insertTransactionQuery = `
                INSERT INTO transactions (sender, amount, recipient, type, transaction_date)
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
            `;
            const updateSenderBalanceQuery = `
                UPDATE balance
                SET balance = balance - $1
                WHERE upid = $2
            `;
            const updateRecipientBalanceQuery = `
                UPDATE balance
                SET balance = balance + $1
                WHERE upid = $2
            `;
            const insertFriendshipQuery = `
                INSERT INTO friends (friend1, friend2)
                SELECT $1::text, $2::text
                WHERE NOT EXISTS (
                    SELECT 1 FROM friends WHERE (friend1 = $1 AND friend2 = $2) OR (friend1 = $2 AND friend2 = $1)
                )
            `;

            const transactionValues = [sender, amount, recipientupi, type];
            const senderBalanceValues = [amount, sender];
            const recipientBalanceValues = [amount, recipientupi];

            try {
                await db.query('BEGIN'); // Start a transaction

                await db.query(insertTransactionQuery, transactionValues);
                await db.query(updateSenderBalanceQuery, senderBalanceValues);
                await db.query(updateRecipientBalanceQuery, recipientBalanceValues);

                // Insert friendship records
                await db.query(insertFriendshipQuery, [sender, recipientupi]);
                await blockchain.addBlockchainTransaction(sender, recipientupi, amount);
                await db.query('COMMIT'); // Commit the transaction

                resolve(true); // Resolve the promise after successful insertion
            } catch (e) {
                await db.query('ROLLBACK'); // Rollback the transaction in case of an error
                console.log("Error in transaction detail: " + e);
                reject(e);
            }
        });
    },
    addFriendTransaction: (detail, sender) => {
        const { recipient, amount, type } = detail;
        //const recipientupi = `${recipient}@chainflow`;
        return new Promise(async (resolve, reject) => {
            const insertTransactionQuery = `
                INSERT INTO transactions (sender, amount, recipient, type, transaction_date)
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
            `;
            const updateSenderBalanceQuery = `
                UPDATE balance
                SET balance = balance - $1
                WHERE upid = $2
            `;
            const updateRecipientBalanceQuery = `
                UPDATE balance
                SET balance = balance + $1
                WHERE upid = $2
            `;


            const transactionValues = [sender, amount, recipient, type];
            const senderBalanceValues = [amount, sender];
            const recipientBalanceValues = [amount, recipient];

            try {
                await db.query('BEGIN'); // Start a transaction

                await db.query(insertTransactionQuery, transactionValues);
                await db.query(updateSenderBalanceQuery, senderBalanceValues);
                await db.query(updateRecipientBalanceQuery, recipientBalanceValues);

                await blockchain.addBlockchainTransaction(sender, recipient, amount);




                await db.query('COMMIT'); // Commit the transaction

                resolve(true); // Resolve the promise after successful insertion
            } catch (e) {
                await db.query('ROLLBACK'); // Rollback the transaction in case of an error
                console.log("Error in transaction detail: " + e);
                reject(e);
            }
        });
    },

    addUpiTransaction: (detail, sender) => {
        const { recipient, amount, type } = detail;
        //const recipientupi = `${recipient}@chainflow`;
        return new Promise(async (resolve, reject) => {
            const insertTransactionQuery = `
                INSERT INTO transactions (sender, amount, recipient, type, transaction_date)
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
            `;
            const updateSenderBalanceQuery = `
                UPDATE balance
                SET balance = balance - $1
                WHERE upid = $2
            `;
            const transactionValues = [sender, amount, recipient, type];
            const senderBalanceValues = [amount, sender];
            try {
                await db.query('BEGIN'); // Start a transaction

                await db.query(insertTransactionQuery, transactionValues);
                await db.query(updateSenderBalanceQuery, senderBalanceValues);
                await blockchain.addBlockchainTransaction(sender, recipient, amount);

                await db.query('COMMIT'); // Commit the transaction

                resolve(true); // Resolve the promise after successful insertion
            } catch (e) {
                await db.query('ROLLBACK'); // Rollback the transaction in case of an error
                console.log("Error in transaction detail: " + e);
                reject(e);
            }
        });
    },
    addMobileTransaction: (detail, sender) => {
        const { recipient, amount, type } = detail;
        const recipientname = `${recipient} Recharge`;
        return new Promise(async (resolve, reject) => {
            const insertTransactionQuery = `
                INSERT INTO transactions (sender, amount, recipient, type, transaction_date)
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
            `;
            const updateSenderBalanceQuery = `
                UPDATE balance
                SET balance = balance - $1
                WHERE upid = $2
            `;
            const transactionValues = [sender, amount, recipientname, type];
            const senderBalanceValues = [amount, sender];
            try {
                await db.query('BEGIN'); // Start a transaction

                await db.query(insertTransactionQuery, transactionValues);
                await db.query(updateSenderBalanceQuery, senderBalanceValues);
                await db.query('COMMIT'); // Commit the transaction
                const query1 = `SELECT * FROM Transactions WHERE sender = $1 ORDER BY transaction_id DESC LIMIT 1`;
                const values1 = [sender];
                const result = await db.query(query1, values1);
                const details = result.rows[0];
                const id = details.transaction_id;
                console.log(id);

                const query2 = `insert into user_mobile_recharge(validity,data,transaction_id,type,phonenumber) values($1,$2,$3,$4,$5)`;
                const values2 = [detail.validity, detail.data, id, detail.type, detail.mobileNumber];

                await db.query(query2, values2);
                await blockchain.addBlockchainTransaction(sender, recipientname, amount);


                resolve(true); // Resolve the promise after successful insertion
            } catch (e) {
                await db.query('ROLLBACK'); // Rollback the transaction in case of an error
                console.log("Error in transaction detail: " + e);
                reject(e);
            }
        });
    },
    addBankTransaction: (detail, sender) => {
        const { recipient, amount, type } = detail;
        //const recipientname = `${recipient} Recharge`;
        return new Promise(async (resolve, reject) => {
            const insertTransactionQuery = `
                INSERT INTO transactions (sender, amount, recipient, type, transaction_date)
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
            `;
            const updateSenderBalanceQuery = `
                UPDATE balance
                SET balance = balance - $1
                WHERE upid = $2
            `;
            const transactionValues = [sender, amount, recipient, type];
            const senderBalanceValues = [amount, sender];
            try {
                await db.query('BEGIN'); // Start a transaction

                await db.query(insertTransactionQuery, transactionValues);
                await db.query(updateSenderBalanceQuery, senderBalanceValues);
                await db.query('COMMIT'); // Commit the transaction
                const query1 = `SELECT * FROM Transactions WHERE sender = $1 ORDER BY transaction_id DESC LIMIT 1`;
                const values1 = [sender];
                const result = await db.query(query1, values1);
                const details = result.rows[0];
                const id = details.transaction_id;
                console.log(id);

                const query2 = `insert into bank_transfer(transaction_id,account_number,ifsc_code,type,amount) values($1,$2,$3,$4,$5)`;
                const values2 = [id, detail.recipient, detail['ifsc-code'], detail.type, detail.amount];

                await db.query(query2, values2);
                await blockchain.addBlockchainTransaction(sender, recipient, amount);


                resolve(true); // Resolve the promise after successful insertion
            } catch (e) {
                await db.query('ROLLBACK'); // Rollback the transaction in case of an error
                console.log("Error in transaction detail: " + e);
                reject(e);
            }
        });
    },
    addWaterTransaction: (detail, sender) => {
        const { recipient, amount, type } = detail;
        //const recipientname = `${recipient} Recharge`;
        return new Promise(async (resolve, reject) => {
            const insertTransactionQuery = `
                INSERT INTO transactions (sender, amount, recipient, type, transaction_date)
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
            `;
            const updateSenderBalanceQuery = `
                UPDATE balance
                SET balance = balance - $1
                WHERE upid = $2
            `;
            const transactionValues = [sender, amount, recipient, type];
            const senderBalanceValues = [amount, sender];
            try {
                await db.query('BEGIN'); // Start a transaction

                await db.query(insertTransactionQuery, transactionValues);
                await db.query(updateSenderBalanceQuery, senderBalanceValues);
                await db.query('COMMIT'); // Commit the transaction
                const query1 = `SELECT * FROM Transactions WHERE sender = $1 ORDER BY transaction_id DESC LIMIT 1`;
                const values1 = [sender];
                const result = await db.query(query1, values1);
                const details = result.rows[0];
                const id = details.transaction_id;
                console.log(id);

                const query2 = `insert into water_transaction(transaction_id,authoriy_name,consumer_number,bill_number,bill_date,due_date,amount) values($1,$2,$3,$4,$5,$6,$7)`;
                const values2 = [id, detail.recipient, detail['consumer-number'], detail['bill-number'], detail.currentdate,detail.duedate,detail.amount];

                await db.query(query2, values2);
                await blockchain.addBlockchainTransaction(sender, recipient, amount);


                resolve(true); // Resolve the promise after successful insertion
            } catch (e) {
                await db.query('ROLLBACK'); // Rollback the transaction in case of an error
                console.log("Error in transaction detail: " + e);
                reject(e);
            }
        });
    },
    addElectricityTransaction: (detail, sender) => {
        const { recipient, amount, type } = detail;
        //const recipientname = `${recipient} Recharge`;
        return new Promise(async (resolve, reject) => {
            const insertTransactionQuery = `
                INSERT INTO transactions (sender, amount, recipient, type, transaction_date)
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
            `;
            const updateSenderBalanceQuery = `
                UPDATE balance
                SET balance = balance - $1
                WHERE upid = $2
            `;
            const transactionValues = [sender, amount, recipient, type];
            const senderBalanceValues = [amount, sender];
            try {
                await db.query('BEGIN'); // Start a transaction

                await db.query(insertTransactionQuery, transactionValues);
                await db.query(updateSenderBalanceQuery, senderBalanceValues);
                await db.query('COMMIT'); // Commit the transaction
                const query1 = `SELECT * FROM Transactions WHERE sender = $1 ORDER BY transaction_id DESC LIMIT 1`;
                const values1 = [sender];
                const result = await db.query(query1, values1);
                const details = result.rows[0];
                const id = details.transaction_id;
                console.log(id);

                const query2 = `insert into electricity_transaction(transaction_id,authority_name,consumer_number,bill_number,bill_date,due_date,amount) values($1,$2,$3,$4,$5,$6,$7)`;
                const values2 = [id, detail.recipient, detail['consumer-number'], detail['bill-number'], detail.currentdate,detail.duedate,detail.amount];

                await db.query(query2, values2);

                resolve(true); // Resolve the promise after successful insertion
                await blockchain.addBlockchainTransaction(sender, recipient, amount);

            } catch (e) {
                await db.query('ROLLBACK'); // Rollback the transaction in case of an error
                console.log("Error in transaction detail: " + e);
                reject(e);
            }
        });
    },

    getSpecificTransaction: (upid) => {
        return new Promise(async (resolve, reject) => {
            const query = `SELECT * FROM Transactions WHERE sender = $1 ORDER BY transaction_id DESC LIMIT 1`;
            const values = [upid];
            try {
                const result = await db.query(query, values);
                const transactionDetail = result.rows[0];
                const lastTransaction = {
                    id: transactionDetail.transaction_id,
                    sender: transactionDetail.sender,
                    amount: transactionDetail.amount,
                    recipient: transactionDetail.recipient,
                    type: transactionDetail.type,
                    date: transactionDetail.transaction_date
                };
                resolve(lastTransaction);
            } catch (e) {
                console.log("Error in taking last transaction: " + e);
                reject(e);
            }
        });
    },
    getRecipientDetail: (upid) => {
        return new Promise(async (resolve, reject) => {
            const query = `SELECT full_name, photo FROM users WHERE upid = $1`;
            const values = [upid];
            try {
                const result = await db.query(query, values);
                const detail = result.rows[0];
                resolve(detail);
            } catch (e) {
                console.log("Error in getting recipient photo: " + e);
                reject(e);
            }
        });
    },
    getTransactionHistory: (upid) => {
        return new Promise(async (resolve, reject) => {
            const query = `
                SELECT 
                    t.transaction_id,
                    t.sender,
                    t.amount,
                    t.recipient,
                    t.type,
                    t.transaction_date,
                    COALESCE(s.full_name, t.sender) as sender_name,
                    COALESCE(r.full_name, t.recipient) as recipient_name
                FROM 
                    transactions t
                LEFT JOIN 
                    users s ON t.sender = s.upid
                LEFT JOIN 
                    users r ON t.recipient = r.upid
                WHERE 
                    t.sender = $1 OR 
                    t.recipient = $1
                ORDER BY 
                    t.transaction_date DESC
            `;
            const values = [upid];
            try {
                const result = await db.query(query, values);
                const transactions = result.rows.map(transaction => ({
                    id: transaction.transaction_id,
                    sender: transaction.sender,
                    sender_name: transaction.sender_name,
                    amount: transaction.amount,
                    recipient: transaction.recipient,
                    recipient_name: transaction.recipient_name,
                    type: transaction.type,
                    date: transaction.transaction_date
                }));
                resolve(transactions);
            } catch (e) {
                console.log("Error in getting transaction history: " + e);
                reject(e);
            }
        });
    },
    searchTransaction: (upid) => {
        return new Promise(async (resolve, reject) => {
            const query = `
                SELECT 
                    t.transaction_id,
                    t.sender,
                    t.amount,
                    t.recipient,
                    t.type,
                    t.transaction_date,
                    COALESCE(s.full_name, t.sender) as sender_name,
                    COALESCE(r.full_name, t.recipient) as recipient_name
                FROM 
                    transactions t
                LEFT JOIN 
                    users s ON t.sender = s.upid
                LEFT JOIN 
                    users r ON t.recipient = r.upid
                WHERE 
                    (t.sender = $1 OR t.recipient = $1) AND t.type = 'global'
                ORDER BY 
                    t.transaction_date DESC
            `;
            const values = [upid];
            try {
                const result = await db.query(query, values);
                const transactions = result.rows.map(transaction => ({
                    id: transaction.transaction_id,
                    sender: transaction.sender,
                    sender_name: transaction.sender_name,
                    amount: transaction.amount,
                    recipient: transaction.recipient,
                    recipient_name: transaction.recipient_name,
                    type: transaction.type,
                    date: transaction.transaction_date
                }));
                resolve(transactions);
            } catch (e) {
                console.log("Error in getting global transactions: " + e);
                reject(e);
            }
        });
    },
    getFriends: (upi) => {
        return new Promise(async (resolve, reject) => {
            const query = `
                SELECT 
                    CASE 
                        WHEN friend1 = $1 THEN friend2 
                        ELSE friend1 
                    END AS friend_upi,
                    u.full_name,
                    u.photo
                FROM 
                    friends f
                JOIN 
                    users u ON (u.upid = f.friend1 OR u.upid = f.friend2) AND u.upid != $1
                WHERE 
                    f.friend1 = $1 OR f.friend2 = $1
            `;
            const values = [upi];
            try {
                const result = await db.query(query, values);
                const friends = result.rows.map(friend => ({
                    upi: friend.friend_upi,
                    full_name: friend.full_name,
                    photo: friend.photo
                }));
                resolve(friends);
            } catch (e) {
                console.log("Error in getting friends: " + e);
                reject(e);
            }
        });
    },
    getMobilePlan: (sim) => {
        let plan = [];
        return new Promise(async (resolve, reject) => {
            const query = `select * from mobile_recharge where sim=$1`;
            const values = [sim];
            try {
                const result = await db.query(query, values);
                const plans = result.rows;
                plans.forEach(element => {
                    plan.push({ id: element.id, validity: element.validity, data: element.data, price: element.price, description: element.description, sim: element.sim, talk_time: element.talk_time })
                })
                resolve(plan);
            } catch (e) {
                console.log('error at occuring mobile recharge plan ' + e);
                reject(e);
            }
        })
    },
    getWaterList: () => {
        return new Promise(async (resolve, reject) => {
            const query = `select * from water_bill`;
            try{
                const result=await db.query(query);
                const detail=result.rows;
                resolve(detail);
            }catch(e){
                console.log("error at getiing water list "+e);
                reject(e);
            }
        })
    },
    getWaterAmount:()=>{
        return new Promise(async(resolve,reject)=>{
            const query=`select * from water_demo`;
            try{
                const result=await db.query(query);
                const detial=result.rows;
                resolve(detial);

            }catch(e){
                console.log("error in getting water amount : ");
                reject(e);
                
            }
        })
    },
    getElectricityList: () => {
        return new Promise(async (resolve, reject) => {
            const query = `select * from electrictiy_bill`;
            try{
                const result=await db.query(query);
                const detail=result.rows;
                resolve(detail);
            }catch(e){
                console.log("error at getiing electricity list "+e);
                reject(e);
            }
        }) 
    },
    getElectricityAmount:()=>{
        return new Promise(async(resolve,reject)=>{
            const query=`select * from electricity_demo`;
            try{
                const result=await db.query(query);
                const detial=result.rows;
                resolve(detial);

            }catch(e){
                console.log("error in getting electricity amount : ");
                reject(e);
                
            }
        })
    },


}

export default helpers;
