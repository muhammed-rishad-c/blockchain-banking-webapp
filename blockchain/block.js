import crypto from 'crypto';

class Blockchain {
    constructor() {
        this.chain = [];
        this.pendingTransactions = [];
        
        // Create the genesis block
        this.createNewBlock(100, '0', '0');
    }

    // Create a new block
    createNewBlock(nonce, previousBlockHash, hash) {
        const newBlock = {
            index: this.chain.length + 1,
            timestamp: Date.now(),
            transactions: this.pendingTransactions,
            nonce: nonce,
            hash: hash,
            previousBlockHash: previousBlockHash
        };
        
        this.pendingTransactions = [];
        this.chain.push(newBlock);
        
        return newBlock;
    }

    // Get the last block in the chain
    getLastBlock() {
        return this.chain[this.chain.length - 1];
    }

    // Create a new transaction
    createNewTransaction(amount, sender, recipient) {
        const newTransaction = {
            amount: amount,
            sender: sender,
            recipient: recipient
        };
        
        this.pendingTransactions.push(newTransaction);
        
        return this.getLastBlock()['index'] + 1;
    }

    // Hash block data
    hashBlock(previousBlockHash, currentBlockData, nonce) {
        const dataAsString = previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);
        const hash = crypto.createHash('sha256').update(dataAsString).digest('hex');
        return hash;
    }

    // Proof of work
    proofOfWork(previousBlockHash, currentBlockData) {
        let nonce = 0;
        let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
        while (hash.substring(0, 4) !== '0000') {
            nonce++;
            hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
        }
        return nonce;
    }

    // Add transaction to blockchain and log the block details
    async addBlockchainTransaction(sender, recipient, amount) {
        const lastBlock = this.getLastBlock();
        const previousBlockHash = lastBlock['hash'];
        const currentBlockData = {
            transactions: this.pendingTransactions,
            index: lastBlock['index'] + 1
        };
        const nonce = this.proofOfWork(previousBlockHash, currentBlockData);
        const blockHash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
        
        this.createNewTransaction(amount, sender, recipient);
        const newBlock = this.createNewBlock(nonce, previousBlockHash, blockHash);

        console.log('Transaction added to blockchain!');
        console.log('New Block:', newBlock);
    }
}

export default Blockchain;
