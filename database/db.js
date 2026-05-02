import pg from 'pg';
import env from 'dotenv';

env.config();

const db = new pg.Client({
    // Use the single URL you provided in Render
    connectionString: process.env.DATABASE_URL,
    // CRITICAL: Neon requires SSL to connect from Render
    ssl: {
        rejectUnauthorized: false
    }
});

db.connect((err) => {
    if (err) {
        console.error("error in connecting database:", err.message);
    } else {
        console.log("database is connected.....");
    }
});

export default db;
