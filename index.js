const express = require('express')
const app = express()
const port = 3000
const campgroundRoute = require('./campgroundRoute')
var cors = require('cors')
const method = require('method-override')
const flash = require('connect-flash')
const session = require('express-session')
const passport = require('passport')
const path = require('path')
const passportLocal = require('passport-local')
const user = require('./models/user')
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require("helmet");
engine = require('ejs-mate')

app.engine('ejs', engine)
app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(method('_method'))
app.use(flash())
app.set("trust proxy", 1);
app.use(cors())
app.use(session({
    secret: "mysecret",
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        maxAge: Date.now() + 1000 * 60 * 60 * 2,
        sameSite: process.env.NODE_ENV === "production" ? 'none' : 'lax',
        secure: process.env.NODE_ENV === "production"
    }
}));
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https:"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https:"]
        }
    })
);

app.use(express.static(path.join(__dirname, 'public')));
app.use(passport.initialize())
app.use(passport.session())
passport.use(new passportLocal(user.authenticate()))
passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());
app.use(mongoSanitize());


app.use(
    helmet.contentSecurityPolicy({
        useDefaults: true,
        directives: {
            'connect-src': ["'self'", "blob:", "https: data:"],
            "img-src": ["'self'", "https: data:"],
            "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'data:',
                'blob:'
                , '*.api.mapbox.com'
            ],
            "script-src-elem": ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'api.mapbox.com', 'blob:']
        }
    })
)
app.use((req, res, next) => {
    res.locals.success = req.flash('success')
    res.locals.err = req.flash('err')
    res.locals.currentUser = req.user
    req.session.to = req.session.to
    next()
})
app.get('/', (req, res) => {

    res.render('home', { title: "Home" })
})
app.post("/login", passport.authenticate('local', {

    failureRedirect: '/login',
    failureFlash: true
}), (req, res, next) => {
    const des = req.session.to ? req.session.to : '/campground'
    req.session.to = '/campground'
    res.redirect(des)
})
app.get("/login", (req, res, next) => {
    if (req.isAuthenticated()) {
        req.flash("err", "already signed")
        res.redirect("/campground")
    }
    else {

        res.render("login.ejs", { title: "Login" })
    }
})
app.get('/logout', (req, res) => {
    req.isAuthenticated(function (err, authenticated) {
        if (authenticated) {
            // User is authenticated, log them out
            req.logOut();
            res.redirect('/campground');
        } else {
            // User is not authenticated, redirect to login
            res.redirect('/login');
        }
    });
})
app.get("/register", (req, res, next) => {

    if (req.isAuthenticated()) {

        req.flash("err", "already signed")
        res.redirect("/campground")

    }
    else {
        res.render("register.ejs", { title: "Register" })
    }
})
app.post("/register", async (req, res, next) => {
    const temp = new user({ username: req.body.user.username, email: req.body.user.email })
    try {
        await user.register(temp, req.body.user.password)
    } catch (e) {
        console.log(e)
        req.flash("err", "choose another email")
        return res.redirect("/register")
    }
    req.logIn(user, (err) => {
        if (err) {
            return next(err.message)
        }
    })
    res.redirect("/campground")
})
app.use("/campground", campgroundRoute)

app.use((req, res) => {

    res.status(404).render("campground/error", { title: "404", msg: "not found" })
})
app.use((err, req, res, next) => {

    const { status = 500, message = "undefiend" } = err
    res.status(status).render("campground/error", { title: status, msg: message })
})
app.listen(port)