require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));

app.set('view engine', 'ejs');

app.use(session({
    secret: "SECCCCCCREEEETTTTT.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

const mongodbPassword = process.env.MONGODB_PASSWORD;
mongoose.connect(`mongodb+srv://purvesh70:${mongodbPassword}@cluster0.fgpah.mongodb.net/newUserDB`, {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema ({
    email: {
        type: String,
        index: true,
        unique: true,
        sparse: true,
    },
    password: {
        type: String,
        index: true,
        unique: true,
        sparse: true,
    },
    googleId: {
        type: String,
        index: true,
        unique: true,
        sparse: true,
    },
    facebookId: {
        type: String,
        index: true,
        unique: true,
        sparse: true,
    },
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://secrets-web-apps.herokuapp.com/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "https://secrets-web-apps.herokuapp.com/auth/facebook/secrets",
    profileFields: ['id', 'displayName', 'photos', 'email']
 
  },
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile);
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", function(req, res){
    res.render("home");
});

app.get("/auth/google", 
    passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/secrets", 
    passport.authenticate("google", {failureRedirect: "/login"}),
    function(req, res){
        res.redirect("/secrets");
    });

app.get("/auth/facebook",
  passport.authenticate("facebook", { scope: ["user_friends"] }));

app.get("/auth/facebook/secrets",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/register", function(req, res){
    res.render("register");
});

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/secrets", function(req, res){
   User.find({"secret": {$ne: null}}, function(err, foundUsers){
       if (err) {
           console.log(err);
       } else {
           if (foundUsers){
           res.render("secrets", {userWithSecrets: foundUsers })
           }
       }
});
});

app.get("/submit", function(req, res){
    if (req.isAuthenticated()){
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.post("/submit", function(req, res){
    const anonymousSecret = req.body.secret;
    console.log(req.user);

    User.findById(req.user.id, function(err, foundUser){
        if (err) {
            console.log(err);

        } else {
            if (foundUser) {
                foundUser.secret = anonymousSecret;
                foundUser.save(function(){
                    res.redirect("/secrets");
                })
                
            }
        }
    });
});

app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
});

app.post("/register", function(req, res){
   User.register({username: req.body.username}, req.body.password, function(err, user){
       if (err){
           console.log(err);
           res.redirect("/register");

       } else {
          passport.authenticate("local")(req, res, function(){
            res.redirect("/secrets");
          })
       }
   })

});

app.post("/login", function(req, res){
    const user = new User ({
        username: req.body.username,
        password: req.body.password
    });

   req.login(user, function(err){
       if (err) {
           console.log(err);
           res.redirect("/login");
       } else {
           passport.authenticate("local")(req, res, function(){
               res.redirect("/secrets");
           })
       }
   })
});


let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, () => console.log(`Server has started at port ${port} successfully.`));

