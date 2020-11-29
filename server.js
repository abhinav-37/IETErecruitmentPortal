const express = require("express");
const PORT = 10000;
const path = require("path");
const ejs = require("ejs");
const mongoose = require("mongoose");
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
const mongoURI ="mongodb+srv://admin-Abhinav:admin-Abhinav@cluster0-fz1t0.mongodb.net/IETERecruitmentPortal";
mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }).then(() => {
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
        default: true
    },
    username: {
        type: String,
        
    },
    registration:{type:String},
    contact_number: {
        type: Number,
    },
    date: {
        type: Date,
        default: Date.now()
    },
    type:String

});
userSchema.plugin(passportLocalMongoose);
const User =  new mongoose.model("User", userSchema);
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//==================== routes start ==================================//

app.get("/", function (req, res) {
    res.render("home");
});
app.get("/about", function (req, res) {
    res.render("about");
});
app.get("/recruitments", function (req, res) {
    res.render("recruitments");
});
app.get("/thanks", function (req, res) {
    res.render("thanks")
})
// ========================= Authentication start =================== //
app.get("/login/:type", function (req, res) {
    let type = req.params.type
    let passedMessage = req.query.message;
    if (type === "user") {
        res.render("login", { user: req.user, passedMessage });
    } else if(type === "admin") {
        res.render("adminPanel/authentication/login",{ passedMessage, user:req.user, type })
    }
});

//GET request for regsiter
app.get("/register/:type", function (req, res) {
     let passedMessage = req.query.message;
    if (req.params.type === "user") {
        res.render("register", { user: req.user,passedMessage })
    } else {
        res.render("adminPanel/authentication/register", {passedMessage, type:req.params.type })
    }
  
});

// POST for the registration of the user
app.post("/register/:type", async function (req, res) {
    let auth = req.user
    const {first_name,last_name, username, password,registration, contact_number,repassword } = req.body;

    if (password === repassword) {
        User.register({ username: username }, password, function (err, user) {
        if (err) {
            console.log(err);
            var message = encodeURIComponent("Email Already Exists");
            res.redirect("/register/user?message="+message);
        } else {
            passport.authenticate("local")(req, res, async function () {
               user.type = req.params.type;
                user.contact_number = contact_number
                user.first_name = first_name
                user.last_name = last_name
                user.registration = registration
                await user.save();
                if(req.params.type === "admin") res.redirect("/adminPanel")
                res.redirect(req.session.returnTo || '/');
                delete req.session.returnTo;

            });
        }
    });
    } else {
          var message = encodeURIComponent('Passwords do not match!');      
          res.redirect('/register/'+ req.params.type +'?message=' + message);     
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
                           
                            passport.authenticate("local", function (err, user, info) {
                               
                                if (user) {
                                    if (req.params.type === "admin") {
                                       
                                        res.redirect("/adminPanel")
                                    } else {
                                        
                                        res.redirect(req.session.returnTo || '/');
                                        delete req.session.returnTo;
                                    }
                                } else {
                                    let message = encodeURIComponent('UserName Or Password is incorrect !');
                                    req.logOut();
                                    res.redirect("/login/"+ req.params.type +"?message=" + message);
                      
                                }
                               
                            })(req, res, function () {});
                        }
                    }); 
                } else {
                    let message = encodeURIComponent('Authetication error!');
                    res.redirect("/login/user?message=" + message);
                }
              
            }
        } else {
            let message = encodeURIComponent('Authentication error!!');
            res.redirect('/login/'+req.params.type+'?message=' + message);
        }
})

app.get("/logout", function (req, res) {
    req.logOut();
    res.redirect(req.session.returnTo || "/")
});

// ===================== get and post for quiz ================= //
app.get("/instruction/:domain", function (req, res) {
    let auth = req.isAuthenticated();
    if (auth) {
        let domain = req.params.domain;
        res.render("instructions",{domain})
    } else {
        res.redirect("/login/user")
    }

})
app.get("/quizPortal/:domain", async function (req, res) {
    let auth = req.isAuthenticated();
    if (auth) {
        let domain = req.params.domain
        if (domain === "ece") {
            let quizQuestions = await QuizEce.find();
           
            res.render("quizPortal", { quizQuestions,domain })
        } else if (domain === "cse") {
            let quizQuestions = await QuizCse.find();
            res.render("quizPortal", { quizQuestions,domain })
        }else if (domain === "design") {
            let quizQuestions = await QuizDesign.find();
            res.render("quizPortal", { quizQuestions,domain })
        }else if (domain === "editorial") {
            let quizQuestions = await QuizEditorial.find();
            res.render("quizPortal", { quizQuestions,domain })
        }
        else if (domain === "management") {
            let quizQuestions = await QuizManagement.find();
            res.render("quizPortal", { quizQuestions,domain })
        }
        else if (domain === "photography") {
            let quizQuestions = await QuizPhotography.find();
            res.render("quizPortal", { quizQuestions,domain })
        }
        
    } else {
        res.redirect("/login/user")
    }
});
app.post("/quizPortal/:domain", async function (req, res) {
    let auth = req.isAuthenticated();
    if (auth) {
        let correctAnswers = []
        let quizAnswers = req.body.answers;
        let domain = req.params.domain
        if (quizAnswers) {
            if (domain === "ece") {
                let questions = await QuizEce.find();
                quizAnswers.forEach(f => {
                    for (let i = 0; i < questions[0].questions.length; i++) {
                        const e = questions[0].questions[i];
               
                        if (f.question.replace(/\s/g, '') === e.question.replace(/\s/g, '')) {
                            if (f.answer.replace(/\s/g, '') === e.answer.replace(/\s/g, '')) {
                                correctAnswers.push(f)
                            }
                        }
                    }
                });
                console.log(correctAnswers);
                res.end(correctAnswers.length.toString())
            } else if (domain === "cse") {
                let questions = await QuizCse.find();
                quizAnswers.forEach(f => {
                    for (let i = 0; i < questions[0].questions.length; i++) {
                        const e = questions[0].questions[i];
               
                        if (f.question.replace(/\s/g, '') === e.question.replace(/\s/g, '')) {
                            if (f.answer.replace(/\s/g, '') === e.answer.replace(/\s/g, '')) {
                                correctAnswers.push(f)
                            }
                        }
                    }
                });
                console.log(correctAnswers);
                res.end(correctAnswers.length.toString())
            } else if (domain === "design") {
                let questions = await QuizDesign.find();
                quizAnswers.forEach(f => {
                    for (let i = 0; i < questions[0].questions.length; i++) {
                        const e = questions[0].questions[i];
               
                        if (f.question.replace(/\s/g, '') === e.question.replace(/\s/g, '')) {
                            if (f.answer.replace(/\s/g, '') === e.answer.replace(/\s/g, '')) {
                                correctAnswers.push(f)
                            }
                        }
                    }
            
                });
                console.log(correctAnswers);
                res.end(correctAnswers.length.toString())
            } else if (domain === "editorial") {
                let questions = await QuizEditorial.find();
                quizAnswers.forEach(f => {
                    for (let i = 0; i < questions[0].questions.length; i++) {
                        const e = questions[0].questions[i];
               
                        if (f.question.replace(/\s/g, '') === e.question.replace(/\s/g, '')) {
                            if (f.answer.replace(/\s/g, '') === e.answer.replace(/\s/g, '')) {
                                correctAnswers.push(f)
                            }
                        }
                    }
                });
                console.log(correctAnswers);
                res.end(correctAnswers.length.toString())
            }
            else if (domain === "management") {
                let questions = await QuizManagement.find();
                quizAnswers.forEach(f => {
                    for (let i = 0; i < questions[0].questions.length; i++) {
                        const e = questions[0].questions[i];
               
                        if (f.question.replace(/\s/g, '') === e.question.replace(/\s/g, '')) {
                            if (f.answer.replace(/\s/g, '') === e.answer.replace(/\s/g, '')) {
                                correctAnswers.push(f)
                            }
                        }
                    }
                });
                console.log(correctAnswers);
                res.end(correctAnswers.length.toString())
            }
            else if (domain === "photography") {
                let questions = await QuizPhotography.find();
                quizAnswers.forEach(f => {
                    for (let i = 0; i < questions[0].questions.length; i++) {
                        const e = questions[0].questions[i];
               
                        if (f.question.replace(/\s/g, '') === e.question.replace(/\s/g, '')) {
                            if (f.answer.replace(/\s/g, '') === e.answer.replace(/\s/g, '')) {
                                correctAnswers.push(f)
                            }
                        }
                    }
                });
                console.log(correctAnswers);
                res.end(correctAnswers.length.toString())
            }
        } else {
             res.end("your score is 0")
        }
    } else {
        res.redirect("/login/user")
    }
})

//=====================admin portal ============ //
app.get("/admin", async function (req, res) {
    if (req.isAuthenticated()) {
        if (req.user.type === "admin") {
            res.render("/adminPanel/adminPanel")
        } else {
            res.redirect("/login/admin")
        }
    } else {
        res.redirect("/login/admin")
    }
});
app.get("/admin/formQuiz", async function (req, res) {
    if (req.isAuthenticated()) {
        if (req.user.type === "admin") {
            res.render("/adminPanel/domainSelection")
        } else {
            res.redirect("/login/admin")
        }
    } else {
        res.redirect("/login/admin")
    }
});
app.post("/admin/formQuiz/:domain", async function (req, res) {
    if (req.isAuthenticated()) {
        if (req.user.type === "admin") {
            let domain = req.params.domain;
            
        } else {
            res.redirect("/login/admin")
        }
    } else {
        res.redirect("/login/admin")
    }
})

//listen
app.listen(process.env.PORT||PORT, function () {
    console.log(`server started on port ${PORT}`);
})