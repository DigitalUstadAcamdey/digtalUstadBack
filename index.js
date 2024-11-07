const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");
const passport = require("passport");
const localStrategy = require("./config/passportLocal");
const jwtStrategy = require("./config/passportJWT");
const gitHubStrategy = require("./config/passportGitHub");
const googleStrategy = require("./config/passportGoogle");
const AppError = require("./utils/appError");
const globalError = require("./controllers/errorController");

//Routes

const authRoutes = require("./routes/authRoutes");
const usersRoutes = require("./routes/usersRoutes");

const app = express();

// allowed body
app.use(express.json());

//set static folder
app.use("*", express.static("public"));

//session middleware

app.use(
  session({ secret: "your-secret", resave: false, saveUninitialized: true })
);

//cookie-parser middleware
app.use(cookieParser());

//setup express flash

app.use(flash());

//express-validator middleware
// app.use(expressValidator());

passport.initialize();
localStrategy(passport);
jwtStrategy(passport);
gitHubStrategy(passport);
googleStrategy(passport);

//setup passport middleware
app.use(passport.initialize());
// must setup session passport after setup session appliction
app.use(passport.session());

//defined routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);

//defined 404 middleware (page not found)
app.all("*", (req, res, next) => {
  // إذا قمنا بتمرير قيمة لnext فإنه يعتبرها رسالة خطأ ويقوم بإعدام جميع البرامج الوسيطة
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// handle Error
app.use(globalError);

module.exports = app;
