import express from 'express';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import path from 'path';
import multer from 'multer';
import helpers from './helper/database.js'; // Updated import
import bcrypt from 'bcrypt';
import session from 'express-session';
import { transcode } from 'buffer';

const app = express();

app.use('/uploads', express.static('public/uploads'));

app.set('view engine', 'ejs');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set secure: true in production
}));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, './public/uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const verifyLogin = (req, res, next) => {
    if (req.session.loggedIn) {
        next();
    } else {
        res.render('login');
    }
};

const upload = multer({ storage: storage });

const saltRounds = 10; // Higher the salt rounds, the more secure it is

const hashPassword = async (password) => {
    try {
        const salt = await bcrypt.genSalt(saltRounds);
        const hashedPassword = await bcrypt.hash(password, salt);
        return hashedPassword;
    } catch (error) {
        console.error('Error hashing password:', error);
    }
};

app.get('/', (req, res) => {
    res.render('signup');
});

app.get('/login', (req, res) => {
    res.render('login')
});

app.get('/signup', (req, res) => {
    res.render("signup")
})

app.post('/signup', upload.single('photo'), async (req, res) => {
    const photo = req.file ? req.file.filename : null;
    if (!photo) {
        console.error('Failed to upload photo');
        return res.status(400).send('Failed to upload photo');
    }
    const { password, ...otherData } = req.body;
    try {
        const hashedPassword = await hashPassword(password);
        const userData = {
            ...otherData,
            password: hashedPassword,
            photo
        };

        helpers.addUser(userData, photo).then((status) => {
            if (status) {
                console.log('Data has been entered into the database');
                //res.send('User registered successfully');
                const { username } = req.body;
                const upid = `${username}@chainflow`;
                helpers.setUpiId(username).then((status) => {
                    if (status) {
                        req.session.loggedIn = true;
                        req.session.upId = upid;
                        res.render('upId-setting', { upId: upid });
                    } else {
                        console.log('error in setting upid');
                    }
                })
            } else {
                res.redirect('/');
            }
        }).catch((err) => {
            console.error('Error during database operation:', err);
            res.status(500).send('Internal Server Error');
        });
    } catch (error) {
        console.error('Error during signup process:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/set-upi-pin', async (req, res) => {
    const { pin, upiId } = req.body;
    const hashedPin = await hashPassword(pin);
    helpers.setPin(hashedPin, upiId).then((status) => {
        if (status) {
            helpers.getUserDetail(upiId).then((detail) => {
                res.render('index', { userDetail: detail });
            }).catch((err) => {
                console.log("error in getting user detail for index page");
                res.send("error in getting in indexpage")
            })
        }
        else res.redirect('/')
    })
})

app.post('/login', async (req, res) => {
    const { password, username } = req.body;
    //console.log('Entered Password:', password);

    try {
        const user = await helpers.getUser(username); // Fetch user details by username
        if (user) {
            const match = await bcrypt.compare(password, user.pasword);
            if (match) {
                const upid = `${username}@chainflow`;
                helpers.getUserDetail(upid).then((detail) => {
                    //console.log(detail);
                    req.session.loggedIn = true;
                    req.session.upId = detail[0].upid;

                    res.render('index', { userDetail: detail });
                }).catch((err) => {
                    console.log('Error in getting user detail from login to index:', err);
                    res.send('Error in getting index login');
                });
            } else {
                console.log('Password does not match');
                res.render('login', { message: 'password is wrong' })
                //res.status(401).send('Invalid credentials');
            }
        } else {
            console.log('User not found');
            res.status(404).send('User not found');
        }
    } catch (err) {
        console.error('Error during login process:', err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/balance/:upid', (req, res) => {
    res.render('pin-balance');
});

app.post('/submit-pin', async (req, res) => {
    const { combinedPin } = req.body;
    //console.log(combinedPin);
    try {
        const user = await helpers.getUserDetail(req.session.upId);
        if (user) {
            //console.log(user);
            const match = await bcrypt.compare(combinedPin, user[0].pin);
            if (match) {
                const balance = await helpers.getBalance(req.session.upId);
                //console.log(req.session.upiId);
                //console.log(balance);
                const detail = await helpers.getUserDetail(req.session.upId);
                if (detail.length > 0) {
                    detail[0].balance = balance.balance;
                }
                //console.log(detail);
                res.render('balance', { userDetail: detail });
            } else {
                res.render("pin-balance", { message: "incorrect pin" });
            }
        } else {
            res.render("pin-balance", { message: "User not found" });
        }
    } catch (e) {
        console.log('error in matching pin number');
        res.render("pin-balance", { message: "incorrect pin" });
        // res.status(500).send('An error occurred while matching the PIN.');
    }
});



app.get('/home', verifyLogin, (req, res) => {
    const upid = req.session.upId;
    helpers.getUserDetail(upid).then((detail) => {
        res.render("index", { userDetail: detail });
    })
})

app.get('/transfer/:upid', (req, res) => {
    const upId = req.params.upid;
    res.render("transaction-username", { upId: upId });
})

app.post("/submit-transaction", (req, res) => {
    //console.log(req.body);
    //res.send("just submit");
    res.render('pin-transaction', { detail: req.body });
})

app.post('/submit-transaction-pin', async (req, res) => {
    //console.log(req.body);
    const { combinedPin } = req.body;
    try {
        const user = await helpers.getUserDetail(req.session.upId);
        if (user) {
            const match = await bcrypt.compare(combinedPin, user[0].pin);
            if (match) {
                const balance = await helpers.getBalance(req.session.upId);
                if (balance.balance >= req.body.amount) {
                    helpers.addTransaction(req.body, req.session.upId)
                        .then((status) => {
                            if (status) {
                                helpers.getSpecificTransaction(req.session.upId)
                                    .then(async (detail) => {
                                        try {
                                            const recipient = await helpers.getRecipientDetail(detail.recipient);
                                            //console.log(recipient);
                                            //console.log(detail);

                                            detail.recipientName = recipient.full_name;
                                            detail.recipientPhoto = recipient.photo;

                                            res.render('payment-successful', { detail: detail });
                                        } catch (error) {
                                            console.log("Error fetching recipient details: " + error);
                                            res.status(500).send("Error fetching recipient details");
                                        }
                                    })
                                    .catch((error) => {
                                        console.log("Error fetching specific transaction: " + error);
                                        res.status(500).send("Error fetching specific transaction");
                                    });
                            } else {
                                console.log("Error adding transaction.");
                                res.status(500).send("Error adding transaction");
                            }
                        })
                        .catch((error) => {
                            console.log("Error adding transaction: " + error);
                            res.status(500).send("Error adding transaction");
                        });
                } else {
                    res.render("transaction-username", { upId: req.session.upId, message: "Insufficient balance" });
                }
            } else {
                res.render("pin-transaction", { message: "Incorrect PIN" });
            }
        } else {
            res.render("pin-transaction", { message: "User not found" });
        }
    } catch (e) {
        console.log("Error during transaction processing: " + e);
        res.status(500).send("Error during transaction processing");
    }
});

app.get('/history/:upid', async (req, res) => {
    const upid = req.params.upid;
    try {
        const history = await helpers.getTransactionHistory(upid);
        res.render('history', { transactions: history, upid: upid });
    } catch (e) {
        console.log("Error in fetching transaction history: " + e);
        res.status(500).send("Server Error");
    }
});

app.get('/search/:upid', (req, res) => {
    res.render('search');
})

app.post('/search', async (req, res) => {
    const { username } = req.body;
    const user = await helpers.isUser(username);
    if (user) {
        const upid = `${username}@chainflow`;
        try {
            const transactions = await helpers.searchTransaction(upid);
            res.render('transaction_history', { transactions, upid });
        } catch (e) {
            console.log("Error in searching for user transactions: " + e);
            res.status(500).send("Server Error");
        }
    } else {
        res.render("search", { message: 'username is wrong' })
        //res.status(404).send('User not found');
    }
});

app.get('/pay-contact/:upi', async (req, res) => {
    const upi = req.params.upi;
    try {
        const friends = await helpers.getFriends(upi);
        res.render('friends', { friends });
    } catch (e) {
        console.log("Error in getting friends: " + e);
        res.status(500).send("Server Error");
    }
});

app.get('/pay-friend/:recipientUpi', async (req, res) => {
    const recipientUpi = req.params.recipientUpi;
    const upId = req.session.upId; // Assuming you have user authentication in place
    try {
        res.render('transaction-friend', { upId: upId, recipient: recipientUpi });
    } catch (e) {
        console.log("Error in rendering friend transaction page: " + e);
        res.status(500).send("Server Error");
    }
});

app.post('/submit-friend-transaction', async (req, res) => {
    console.log(req.body);

    res.render('pin-friend', { detail: req.body })
});

app.post('/submit-friend-transaction-pin', async (req, res) => {
    //console.log(req.body);
    const { combinedPin } = req.body;
    try {
        const user = await helpers.getUserDetail(req.session.upId);
        if (user) {
            const match = await bcrypt.compare(combinedPin, user[0].pin);
            if (match) {
                const balance = await helpers.getBalance(req.session.upId);
                if (balance.balance >= req.body.amount) {
                    helpers.addFriendTransaction(req.body, req.session.upId)
                        .then((status) => {
                            if (status) {
                                helpers.getSpecificTransaction(req.session.upId)
                                    .then(async (detail) => {
                                        try {
                                            const recipient = await helpers.getRecipientDetail(detail.recipient);
                                            //console.log(recipient);
                                            //console.log(detail);

                                            detail.recipientName = recipient.full_name;
                                            detail.recipientPhoto = recipient.photo;

                                            res.render('payment-successful', { detail: detail });
                                        } catch (error) {
                                            console.log("Error fetching recipient details: " + error);
                                            res.status(500).send("Error fetching recipient details");
                                        }
                                    })
                                    .catch((error) => {
                                        console.log("Error fetching specific transaction: " + error);
                                        res.status(500).send("Error fetching specific transaction");
                                    });
                            } else {
                                console.log("Error adding transaction.");
                                res.status(500).send("Error adding transaction");
                            }
                        })
                        .catch((error) => {
                            console.log("Error adding transaction: " + error);
                            res.status(500).send("Error adding transaction");
                        });
                } else {
                    res.render("transaction-friend", { upId: req.session.upId, recipient: req.body.recipient, message: "Insufficient balance" });
                }
            } else {
                res.render("pin-transaction", { message: "Incorrect PIN" });
            }
        } else {
            res.render("pin-number2", { message: "User not found" });
        }
    } catch (e) {
        console.log("Error during transaction processing: " + e);
        res.status(500).send("Error during transaction processing");
    }
});

app.get('/pay-any-upi/:upid', (req, res) => {
    const upId = req.params.upid;
    res.render('transaction-upi', { upId: upId })
})

app.post("/submit-upi-transfer", (req, res) => {
    console.log(req.body);

    res.render('pin-upi', { detail: req.body })
})


app.post('/submit-upi-pin', async (req, res) => {
    console.log(req.body);
    const { combinedPin } = req.body;
    try {
        const user = await helpers.getUserDetail(req.session.upId);
        if (user) {
            const match = await bcrypt.compare(combinedPin, user[0].pin);
            if (match) {
                const balance = await helpers.getBalance(req.session.upId);
                if (balance.balance >= req.body.amount) {
                    helpers.addUpiTransaction(req.body, req.session.upId)
                        .then((status) => {
                            if (status) {
                                helpers.getSpecificTransaction(req.session.upId)
                                    .then(async (detail) => {
                                        try {


                                            detail.recipientName = req.body.recipientUpi;
                                            detail.recipientPhoto = 'upi-payment.jpeg';

                                            res.render('payment-successful', { detail: detail });
                                        } catch (error) {
                                            console.log("Error fetching recipient details: " + error);
                                            res.status(500).send("Error fetching recipient details");
                                        }
                                    })
                                    .catch((error) => {
                                        console.log("Error fetching specific transaction: " + error);
                                        res.status(500).send("Error fetching specific transaction");
                                    });
                            } else {
                                console.log("Error adding transaction.");
                                res.status(500).send("Error adding transaction");
                            }
                        })
                        .catch((error) => {
                            console.log("Error adding transaction: " + error);
                            res.status(500).send("Error adding transaction");
                        });
                } else {
                    res.render("transaction-upi", { upId: req.session.upId, message: "Insufficient balance" });
                }
            } else {
                res.render("pin-transaction", { message: "Incorrect PIN" });
            }
        } else {
            res.render("pin-transaction", { message: "User not found" });
        }
    } catch (e) {
        console.log("Error during transaction processing: " + e);
        res.status(500).send("Error during transaction processing");
    }
});

app.get('/logout', (req, res) => {
    req.session.loggedIn = false;
    res.render('login');
})

app.get('/user-profile/:upid', async (req, res) => {
    const upid = req.params.upid;
    try {
        const result = await helpers.getUserDetail(upid);
        if (result.length > 0) {
            res.render('user-profile', { user: result[0] });
        } else {
            res.render('user-profile', { user: null });
        }
    } catch (e) {
        console.log("Error in getting user profile: " + e);
        res.render('user-profile', { user: null });
    }
});

app.get('/mobile-recharge/:upid', (req, res) => {
    const upid = req.params.upid;
    res.render('mobile-recharge', { upid: upid });
})
app.post('/submit-mobile-recharge', async (req, res) => {
    req.session.upId = req.body.upId || req.session.upId; // Ensure upId is set in the session
    const { sim } = req.body;
    const result = await helpers.getMobilePlan(sim);
    res.render('mobile-recharge-list', { plans: result, upid: req.session.upId, mobileNumber: req.body['mobile-number'] });
});


app.post('/submit-specific-mobile-plan', (req, res) => {
    res.render('confirm-mobile-recharge', { details: req.body });
});

app.post('/process-mobile-payment', (req, res) => {
    console.log(req.body);
    res.render('pin-mobile-recharge', { detail: req.body });
});


app.post('/submit-mobile-transaction-pin', async (req, res) => {
    console.log(req.body);
    const recipient_name = `${req.body.recipient} Recharge`;
    const { combinedPin } = req.body;

    try {
        const user = await helpers.getUserDetail(req.session.upId);
        if (!user) {
            return res.render("pin-mobile-recharge", { message: "User not found", detail: req.body });
        }

        const match = await bcrypt.compare(combinedPin, user[0].pin);
        if (!match) {
            return res.render("pin-mobile-recharge", { message: "Incorrect PIN", detail: req.body });
        }

        const balance = await helpers.getBalance(req.session.upId);
        if (!balance || balance.balance < req.body.amount) {
            return res.render("mobile-recharge", { upid: req.session.upId, message: "Insufficient balance" });
        }

        const status = await helpers.addMobileTransaction(req.body, req.session.upId);
        if (!status) {
            console.log("Error adding transaction.");
            return res.status(500).send("Error adding transaction");
        }

        const detail = await helpers.getSpecificTransaction(req.session.upId);
        if (!detail) {
            console.log("Error fetching specific transaction.");
            return res.status(500).send("Error fetching specific transaction");
        }

        detail.recipientName = recipient_name;
        detail.recipientPhoto = `${req.body.recipient}.jpeg`;
        return res.render('payment-successful', { detail: detail });

    } catch (e) {
        console.log("Error during transaction processing: " + e);
        return res.status(500).send("Error during transaction processing");
    }
});

app.get('/bank-transfer/:upid', (req, res) => {
    res.render('bank-transfer', { upid: req.session.upId });
});

app.post('/transfer-bank', (req, res) => {
    //console.log(req.body);
    res.render('bank-valid', { detail: req.body });
});

app.post('/complete-bank-transfer', (req, res) => {
    //console.log(req.body);
    res.render("pin-bank", { detail: req.body, upid: req.session.upId })
})

app.post('/submit-bank-pin', async (req, res) => {
    //console.log(req.body);


    const { combinedPin } = req.body;

    try {
        const user = await helpers.getUserDetail(req.session.upId);
        if (!user) {
            return res.render("pin-bank", { message: "User not found", detail: req.body });
        }

        const match = await bcrypt.compare(combinedPin, user[0].pin);
        if (!match) {
            return res.render("pin-bank", { message: "Incorrect PIN", detail: req.body });
        }

        const balance = await helpers.getBalance(req.session.upId);
        if (!balance || balance.balance < req.body.amount) {
            return res.render("bank-transfer", { upid: req.session.upId, message: "Insufficient balance" });
        }

        const status = await helpers.addBankTransaction(req.body, req.session.upId);
        if (!status) {
            console.log("Error adding transaction.");
            return res.status(500).send("Error adding transaction");
        }

        const detail = await helpers.getSpecificTransaction(req.session.upId);
        if (!detail) {
            console.log("Error fetching specific transaction.");
            return res.status(500).send("Error fetching specific transaction");
        }

        detail.recipientName = detail.recipient;
        detail.recipientPhoto = 'bank-transfer.jpeg';
        return res.render('payment-successful', { detail: detail });

    } catch (e) {
        console.log("Error during transaction processing: " + e);
        return res.status(500).send("Error during transaction processing");
    }

})

app.get('/water-bill/:upid', async (req, res) => {
    const WaterList = await helpers.getWaterList();
    res.render('water-list', { waterAuthority: WaterList });
})

app.post('/submit-water-bill-authority', (req, res) => {
    console.log(req.body);
    const { authorityName } = req.body;
    res.render('water-bill', { authorityName: authorityName });

});

app.post('/water-bill-payment', async (req, res) => {
    console.log(req.body);
    const waterBill = await helpers.getWaterAmount();
    console.log(waterBill);
    const billData = {
        ...waterBill[0],
        authorityName: req.body.authorityName,
        'consumer-number': req.body['consumer-number']
    };
    res.render('water-valid', { bill: billData });
});

app.post('/process-water-payment', (req, res) => {
    console.log(req.body);
    res.render("pin-water", { detail: req.body, upid: req.session.upId })
})

app.post('/submit-water-pin', async (req, res) => {
    console.log(req.body);

    const { combinedPin } = req.body;
    try {
        const user = await helpers.getUserDetail(req.session.upId);
        if (!user) {
            return res.render("pin-water", { message: "User not found", detail: req.body });
        }

        const match = await bcrypt.compare(combinedPin, user[0].pin);
        if (!match) {
            return res.render("pin-water", { message: "Incorrect PIN", detail: req.body });
        }

        const balance = await helpers.getBalance(req.session.upId);
        if (!balance || balance.balance < req.body.amount) {
            return res.render("water-bill", { upid: req.session.upId, message: "Insufficient balance" });
        }

        const status = await helpers.addWaterTransaction(req.body, req.session.upId);
        if (!status) {
            console.log("Error adding transaction.");
            return res.status(500).send("Error adding transaction");
        }

        const detail = await helpers.getSpecificTransaction(req.session.upId);
        if (!detail) {
            console.log("Error fetching specific transaction.");
            return res.status(500).send("Error fetching specific transaction");
        }

        detail.recipientName = detail.recipient;
        detail.recipientPhoto = `${req.body.recipient}.jpeg`;
        return res.render('payment-successful', { detail: detail });

    } catch (e) {
        console.log("Error during transaction processing: " + e);
        return res.status(500).send("Error during transaction processing");
    }

});

app.get('/electricity-bill/:upid', async (req, res) => {
    const WaterList = await helpers.getElectricityList();
    res.render('electricity-list', { electricityAuthority: WaterList });
})

app.post('/submit-electricity-bill-authority', (req, res) => {
    console.log(req.body);
    const { authorityName } = req.body;
    res.render('electricity-bill', { authorityName: authorityName });
});

app.post('/electricity-bill-payment', async (req, res) => {
    console.log(req.body);
    const electricityBill = await helpers.getElectricityAmount();
    console.log(electricityBill);
    const billData = {
        ...electricityBill[0],
        authorityName: req.body.authorityName,
        'consumer-number': req.body['consumer-number']
    };
    res.render('electricity-valid', { bill: billData });
});

app.post('/process-electricity-payment', (req, res) => {
    console.log(req.body);
    res.render("pin-electricity", { detail: req.body, upid: req.session.upId })
})

app.post('/submit-electricity-pin', async (req, res) => {
    console.log(req.body);

    const { combinedPin } = req.body;
    try {
        const user = await helpers.getUserDetail(req.session.upId);
        if (!user) {
            return res.render("pin-electricity", { message: "User not found", detail: req.body });
        }

        const match = await bcrypt.compare(combinedPin, user[0].pin);
        if (!match) {
            return res.render("pin-electricity", { message: "Incorrect PIN", detail: req.body });
        }

        const balance = await helpers.getBalance(req.session.upId);
        if (!balance || balance.balance < req.body.amount) {
            return res.render("electricity-bill", { upid: req.session.upId, message: "Insufficient balance" });
        }

        const status = await helpers.addElectricityTransaction(req.body, req.session.upId);
        if (!status) {
            console.log("Error adding transaction.");
            return res.status(500).send("Error adding transaction");
        }

        const detail = await helpers.getSpecificTransaction(req.session.upId);
        if (!detail) {
            console.log("Error fetching specific transaction.");
            return res.status(500).send("Error fetching specific transaction");
        }

        detail.recipientName = detail.recipient;
        detail.recipientPhoto = `${req.body.recipient}.jpg`;
        return res.render('payment-successful', { detail: detail });

    } catch (e) {
        console.log("Error during transaction processing: " + e);
        return res.status(500).send("Error during transaction processing");
    }

});

app.listen(3000, () => {
    console.log("Server is running on port 3000...");
});
