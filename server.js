const express = require("express");
const PORT = 11000 || process.env.PORT;
const path = require("path");
const ejs = require("ejs");
const mongoose = require("mongoose");
const { DateTime } = require("luxon");
const nodemailer = require("nodemailer");
//auth
const session = require("express-session");
const bodyParser = require("body-parser");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const app = express();
//quiz
const QuizCse = require("./models/quizCse");
const QuizEce = require("./models/quizEce");
const QuizEditorial = require("./models/quizEditorial");
const QuizManagement = require("./models/quizManagement");
const QuizPhotography = require("./models/quizPhotography");
const QuizDesign = require("./models/quizDesign");
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);
app.use(
    session({
        secret: "keyboard cat",
        resave: false,
        saveUninitialized: false,
    })
);
app.use(passport.initialize());
app.use(passport.session());
//mongo db
const mongoURI =
    "mongodb+srv://admin-Abhinav:admin-Abhinav@cluster0-fz1t0.mongodb.net/IETERecruitmentPortal";
mongoose
    .connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => {
        console.log("database has been connected");
    });
mongoose.set("useCreateIndex", true);
//========================== User Schema start ==========================//
//user schema
const userSchema = new mongoose.Schema({
    first_name: String,
    last_name: String,
    access: {
        type: Boolean,
        default: true,
    },
    username: {
        type: String,
    },
    registration: { type: String },
    contact_number: {
        type: Number,
    },
    date: {
        type: Date,
        default: Date.now(),
    },
    correctAnswers: {
        type: Array,
    },
    allAnswers: {
        type: Array,
    },
    startTime: {
        type: Array,
    },
    verified: {
        type: Boolean,
        default: false,
    },
    otpGenerated: {
        type: String,
    },
    type: String,
});
userSchema.plugin(passportLocalMongoose);
const User = new mongoose.model("User", userSchema);
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//==================== routes start ==================================//

app.get("/", function (req, res) {
    let passed = req.query.message;
    req.session.returnTo = req.originalUrl;
    res.render("home", { passed, user: req.user });
});
app.get("/about", function (req, res) {
    req.session.returnTo = req.originalUrl;
    res.render("about", { user: req.user });
});
app.get("/recruitments", function (req, res) {
    req.session.returnTo = req.originalUrl;
    res.render("recruitments", { user: req.user });
});
app.get("/thanks", function (req, res) {
    res.render("thanks", { user: req.user });
});
// ========================= Authentication start =================== //

app.get("/login/:type", function (req, res) {
    let type = req.params.type;
    let passedMessage = req.query.message;
    if (type === "user") {
        res.render("login", { user: req.user, passedMessage });
    } else if (type === "admin") {
        res.render("adminPanel/authentication/login", {
            passedMessage,
            user: req.user,
            type,
        });
    }
});

//GET request for regsiter
app.get("/register/:type", function (req, res) {
    let passedMessage = req.query.message;
    if (req.params.type === "user") {
        res.render("register", { user: req.user, passedMessage });
    } else {
        res.render("adminPanel/authentication/register", {
            passedMessage,
            type: req.params.type,
        });
    }
});

// POST for the registration of the user
app.get("/verificationPage", async function (req, res) {
    let passedMessage = req.query.message;
    res.render("verificationPage", { user: req.user, passedMessage });
});
app.post("/verifyAccount", async function (req, res) {
    let otp = req.body.generatedOtp;
    if (otp === req.user.otpGenerated) {
        req.user.verified = true;
        await req.user.save();
        let message = encodeURIComponent("Congratulations! You are verified.");
        res.redirect("/?message=" + message);
    } else {
        let message = encodeURIComponent("Wrong OTP try again!");
        res.redirect("verificationPage?message=" + message);
    }
});
app.post("/register/:type", async function (req, res) {
    let auth = req.user;
    const {
        first_name,
        last_name,
        username,
        password,
        registration,
        contact_number,
        repassword,
    } = req.body;
    if (
        username.endsWith("2019@vitstudent.ac.in") ||
        username.endsWith("2020@vitstudent.ac.in")
    ) {
        if (password === repassword) {
            User.register(
                { username: username },
                password,
                function (err, user) {
                    if (err) {
                        console.log(err);
                        var message = encodeURIComponent(
                            "Email Already Exists"
                        );
                        res.redirect("/register/user?message=" + message);
                    } else {
                        passport.authenticate("local")(
                            req,
                            res,
                            async function () {
                                let otp = Math.floor(Math.random() * 10000);
                                user.type = req.params.type;
                                user.contact_number = contact_number;
                                user.first_name = first_name;
                                user.last_name = last_name;
                                user.registration = registration;
                                user.otpGenerated = otp;
                                await user.save();
                                //mailing starts here

                                let mailOptions = {
                                    from: "ieterecruitment@gmail.com",
                                    to: username,
                                    subject:
                                        "IETE Recruitments 2020 - Registration Verification",
                                    html:
                                        '<body style="padding: 20px; background-color: rgb(25,35,75); color: white;font-family: Roboto; text-align: center">Welcome to IETE Recruitments 2020, <b>' +
                                        first_name +
                                        "</b><br><br><h2>Your Email Verification code is <b>" +
                                        otp +
                                        "</b></h2><br>Please use this code to verify your account. <br><br>Best Regards,<br>IETE VIT</body>",
                                };
                                let transporter = nodemailer.createTransport({
                                    host: "smtp.gmail.com",
                                    port: 587,
                                    secure: false, // true for 465, false for other ports
                                    auth: {
                                        user: "ieterecruitment@gmail.com",
                                        pass: "Hello@123",
                                    },
                                    tls: {
                                        rejectUnauthorized: false,
                                    },
                                });
                                await transporter.sendMail(mailOptions);
                                //mailing ends
                                if (req.params.type === "admin")
                                    res.redirect("/adminPanel");
                                res.redirect("/verificationPage");
                                delete req.session.returnTo;
                            }
                        );
                    }
                }
            );
        } else {
            var message = encodeURIComponent("Passwords do not match!");
            res.redirect(
                "/register/" + req.params.type + "?message=" + message
            );
        }
    } else {
        var message = encodeURIComponent(
            "Only vit mail address of first and second years is allowed!"
        );
        res.redirect("/register/" + req.params.type + "?message=" + message);
    }
});

// POST for the login of the user
app.post("/login/:type", async function (req, res) {
    let user = await User.findOne({ username: req.body.username });
    if (user) {
        if (user.type === req.params.type) {
            if (user.access) {
                const user = new User({
                    username: req.body.username,
                    password: req.body.password,
                });

                req.login(user, function (err) {
                    if (err) {
                        console.log(err);
                    } else {
                        passport.authenticate(
                            "local",
                            function (err, user, info) {
                                if (user) {
                                    if (req.params.type === "admin") {
                                        res.redirect("/adminPanel");
                                    } else {
                                        res.redirect(
                                            req.session.returnTo || "/"
                                        );
                                        delete req.session.returnTo;
                                    }
                                } else {
                                    let message = encodeURIComponent(
                                        "UserName Or Password is incorrect !"
                                    );
                                    req.logOut();
                                    res.redirect(
                                        "/login/" +
                                            req.params.type +
                                            "?message=" +
                                            message
                                    );
                                }
                            }
                        )(req, res, function () {});
                    }
                });
            } else {
                let message = encodeURIComponent("Authetication error!");
                res.redirect("/login/user?message=" + message);
            }
        }
    } else {
        let message = encodeURIComponent("Authentication error!!");
        res.redirect("/login/" + req.params.type + "?message=" + message);
    }
});

app.get("/logout", function (req, res) {
    req.logOut();
    res.redirect(req.session.returnTo || "/");
});

// ===================== get and post for quiz ================= //
app.get("/instruction/:domain", function (req, res) {
    let auth = req.isAuthenticated();
    if (auth && req.user.verified) {
        let num = 0;
        req.user.correctAnswers.forEach(function (e) {
            if (e.domain === req.params.domain) {
                num += 1;
            }
        });
        if (num == 0) {
            let domain = req.params.domain;
            num = 0;
            res.render("instructions", { domain, user: req.user });
        } else {
            let message = encodeURIComponent("Already attempted!");
            num = 0;
            res.redirect("/?message=" + message);
        }
    } else {
        res.redirect("/register/user");
    }
});
app.get("/quizPortal/:domain", async function (req, res) {
    let auth = req.isAuthenticated();
    if (auth && req.user.verified) {
        let num = 0;
        req.user.correctAnswers.forEach(function (e) {
            if (e.domain === req.params.domain) {
                num += 1;
            }
        });
        if (num == 0) {
            num = 0;
            tnum = 0;
            req.user.startTime.forEach(function (e) {
                if (e.domain === req.params.domain) {
                    tnum += 1;
                }
            });
            if (tnum === 0) {
                req.user.startTime.push({
                    domain: req.params.domain,
                    startTime: Date.now(),
                });
                req.user.save();
                tnum = 0;
            }
            let domain = req.params.domain;
            if (domain === "ece") {
                let quizQuestions = await QuizEce.find();

                res.render("quizPortal", { quizQuestions, domain });
            } else if (domain === "cse") {
                let quizQuestions = await QuizCse.find();
                res.render("quizPortal", { quizQuestions, domain });
            } else if (domain === "design") {
                let quizQuestions = await QuizDesign.find();
                res.render("quizPortal", { quizQuestions, domain });
            } else if (domain === "editorial") {
                let quizQuestions = await QuizEditorial.find();
                res.render("quizPortal", { quizQuestions, domain });
            } else if (domain === "management") {
                let quizQuestions = await QuizManagement.find();
                res.render("quizPortal", { quizQuestions, domain });
            } else if (domain === "photography") {
                let quizQuestions = await QuizPhotography.find();
                res.render("quizPortal", { quizQuestions, domain });
            } else {
                let message = encodeURIComponent("Don't try to act smart!");
                res.redirect("/?message=" + message);
            }
        } else {
            num = 0;
            let message = encodeURIComponent("All ready attempted!");
            res.redirect("/?message=" + message);
        }
    } else {
        res.redirect("/register/user");
    }
});
app.post("/quizPortal/:domain", async function (req, res) {
    let auth = req.isAuthenticated();
    try {
        if (auth) {
            let correctAnswers = [];
            let quizAnswers = req.body.answers;
            let domain = req.params.domain;
            if (quizAnswers) {
                if (domain === "ece") {
                    let questions = await QuizEce.find();
                    console.log(quizAnswers);
                    quizAnswers.forEach((f) => {
                        for (
                            let i = 0;
                            i < questions[0].questions.length;
                            i++
                        ) {
                            const e = questions[0].questions[i];

                            if (
                                f.question.replace(/\s/g, "") ===
                                e.question.replace(/\s/g, "")
                            ) {
                                if (e.type === "MCQ") {
                                    console.log("found mcqs");
                                    if (
                                        f.answer.replace(/\s/g, "") ===
                                        e.answer.replace(/\s/g, "")
                                    ) {
                                        correctAnswers.push(f);
                                    }
                                } else if (e.type === "LA") {
                                    correctAnswers.push(f);
                                }
                            }
                        }
                    });
                    res.end(correctAnswers.length.toString());
                } else if (domain === "cse") {
                    let questions = await QuizCse.find();
                    quizAnswers.forEach((f) => {
                        for (
                            let i = 0;
                            i < questions[0].questions.length;
                            i++
                        ) {
                            const e = questions[0].questions[i];

                            if (
                                f.question.replace(/\s/g, "") ===
                                e.question.replace(/\s/g, "")
                            ) {
                                if (e.type === "MCQ") {
                                    if (
                                        f.answer.replace(/\s/g, "") ===
                                        e.answer.replace(/\s/g, "")
                                    ) {
                                        correctAnswers.push(f);
                                    }
                                } else if (e.type === "LA") {
                                    correctAnswers.push(f);
                                }
                            }
                        }
                    });
                    console.log(correctAnswers);
                    res.end(correctAnswers.length.toString());
                } else if (domain === "design") {
                    let questions = await QuizDesign.find();
                    quizAnswers.forEach((f) => {
                        for (
                            let i = 0;
                            i < questions[0].questions.length;
                            i++
                        ) {
                            const e = questions[0].questions[i];

                            if (
                                f.question.replace(/\s/g, "") ===
                                e.question.replace(/\s/g, "")
                            ) {
                                if (e.type === "MCQ") {
                                    if (
                                        f.answer.replace(/\s/g, "") ===
                                        e.answer.replace(/\s/g, "")
                                    ) {
                                        correctAnswers.push(f);
                                    }
                                } else if (e.type === "LA") {
                                    correctAnswers.push(f);
                                }
                            }
                        }
                    });
                    console.log(correctAnswers);
                    res.end(correctAnswers.length.toString());
                } else if (domain === "editorial") {
                    let questions = await QuizEditorial.find();
                    quizAnswers.forEach((f) => {
                        for (
                            let i = 0;
                            i < questions[0].questions.length;
                            i++
                        ) {
                            const e = questions[0].questions[i];

                            if (
                                f.question.replace(/\s/g, "") ===
                                e.question.replace(/\s/g, "")
                            ) {
                                if (e.type === "MCQ") {
                                    if (
                                        f.answer.replace(/\s/g, "") ===
                                        e.answer.replace(/\s/g, "")
                                    ) {
                                        correctAnswers.push(f);
                                    }
                                } else if (e.type === "LA") {
                                    correctAnswers.push(f);
                                }
                            }
                        }
                    });
                    console.log(correctAnswers);
                    res.end(correctAnswers.length.toString());
                } else if (domain === "management") {
                    let questions = await QuizManagement.find();
                    quizAnswers.forEach((f) => {
                        for (
                            let i = 0;
                            i < questions[0].questions.length;
                            i++
                        ) {
                            const e = questions[0].questions[i];

                            if (
                                f.question.replace(/\s/g, "") ===
                                e.question.replace(/\s/g, "")
                            ) {
                                if (e.type === "MCQ") {
                                    if (
                                        f.answer.replace(/\s/g, "") ===
                                        e.answer.replace(/\s/g, "")
                                    ) {
                                        correctAnswers.push(f);
                                    }
                                } else if (e.type === "LA") {
                                    correctAnswers.push(f);
                                }
                            }
                        }
                    });
                    console.log(correctAnswers);
                    res.end(correctAnswers.length.toString());
                } else if (domain === "photography") {
                    let questions = await QuizPhotography.find();
                    quizAnswers.forEach((f) => {
                        for (
                            let i = 0;
                            i < questions[0].questions.length;
                            i++
                        ) {
                            const e = questions[0].questions[i];

                            if (
                                f.question.replace(/\s/g, "") ===
                                e.question.replace(/\s/g, "")
                            ) {
                                if (e.type === "MCQ") {
                                    if (
                                        f.answer.replace(/\s/g, "") ===
                                        e.answer.replace(/\s/g, "")
                                    ) {
                                        correctAnswers.push(f);
                                    }
                                } else if (e.type === "LA") {
                                    correctAnswers.push(f);
                                }
                            }
                        }
                    });
                    console.log(correctAnswers);
                    res.end(correctAnswers.length.toString());
                }
                let correctToSubmit = {
                    domain,
                    correctAnswers,
                    submittedTime: Date.now(),
                };
                let allAnswers = { domain, quizAnswers };
                req.user.correctAnswers.push(correctToSubmit),
                    req.user.allAnswers.push(allAnswers);
                await req.user.save();
            } else {
                res.end("your score is 0");
            }
        } else {
            res.redirect("/login/user");
        }
    } catch (error) {
        console.log(error);
    }
});
app.post("/getUserData", async function (req, res) {
    let auth = req.isAuthenticated();
    if (auth) {
        let user = JSON.stringify(req.user);
        res.end(user);
    } else {
        res.end("null");
    }
});
//=====================admin portal ============ //
app.get("/admin", async function (req, res) {
    if (!req.isAuthenticated()) {
        if ("a" == "a") {
            res.render("adminPanel/adminPanel");
        } else {
            res.redirect("/login/admin");
        }
    } else {
        res.redirect("/login/admin");
    }
});
app.get("/admin/formQuiz", async function (req, res) {
    if (req.isAuthenticated()) {
        if (req.user.type === "admin") {
            res.render("/adminPanel/domainSelection");
        } else {
            res.redirect("/login/admin");
        }
    } else {
        res.redirect("/login/admin");
    }
});
app.post("/admin/formQuiz/:domain", async function (req, res) {
    if (req.isAuthenticated()) {
        if (req.user.type === "admin") {
            let domain = req.params.domain;
        } else {
            res.redirect("/login/admin");
        }
    } else {
        res.redirect("/login/admin");
    }
});
app.post("/questionSubmit", async function (req, res) {
    const {
        laQues_name,
        domain,
        mcqQues_name,
        mcq_opt_a,
        mcq_opt_b,
        mcq_opt_c,
        mcq_opt_d,
        mcq_ans,
        question_type,
    } = req.body;
    let questions = [];
    for (let i = 0; i < question_type.length; i++) {
        if (question_type[i] === "MCQ") {
            questions.push({
                question: mcqQues_name[i],
                options: [
                    mcq_opt_a[i],
                    mcq_opt_b[i],
                    mcq_opt_c[i],
                    mcq_opt_d[i],
                ],
                answer: mcq_ans[i],
                type: question_type[i],
            });
        } else {
            questions.push({
                question: laQues_name[i + 1 - mcqQues_name.length],
                type: question_type[i],
            });
        }
    }
    console.log(req.body);
    console.log(questions);

    if (domain === "ece") {
        let quizQuestions = new QuizEce({ questions });
        await quizQuestions.save();
        res.redirect("/admin");
    } else if (domain === "cse") {
        let quizQuestions = new QuizCse({ questions });
        await quizQuestions.save();
        res.redirect("/admin");
    } else if (domain === "design") {
        let quizQuestions = new QuizDesign({ questions });
        await quizQuestions.save();
        res.redirect("/admin");
    } else if (domain === "editorial") {
        let quizQuestions = new QuizEditorial({ questions });
        await quizQuestions.save();
        res.redirect("/admin");
    } else if (domain === "management") {
        let quizQuestions = new QuizManagement({ questions });
        await quizQuestions.save();
        res.redirect("/admin");
    } else if (domain === "photography") {
        let quizQuestions = new QuizPhotography({ questions });
        await quizQuestions.save();
        res.redirect("/admin");
    }
});
//listen
app.listen(process.env.PORT || PORT, function () {
    console.log(`server started on port ${PORT}`);
});
