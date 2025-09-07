
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const localStrategy = require("./config/passportLocal");
const jwtStrategy = require("./config/passportJWT");
const AppError = require("./utils/appError");
const globalError = require("./controllers/errorController");
const socketIo = require("socket.io");
const http = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");

//Routes

const authRoutes = require("./routes/authRoutes");
const usersRoutes = require("./routes/usersRoutes");
const courseRoutes = require("./routes/courseRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const faqRoutes = require("./routes/faqRoutes");
const commentRoutes = require("./routes/commentRoutes");
const adminRoutes = require("./routes/admin.route");
const teacherRoutes = require("./routes/teacher.route");
const couponRoutes = require("./routes/coupon.route");

const app = express();

//cors
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://e-learning-platform-eosin.vercel.app",
    ],
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT"], // حدد طرق HTTP المسموح بها
    credentials: true, // إذا كنت تستخدم ملفات تعريف الارتباط أو تتعامل مع بيانات اعتماد المستخدم
  })
);

//setup socket.io

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.set("socketio", io);
io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

// allowed body
app.use(express.json());
// allowed cookies
app.use(cookieParser());

app.use((req, res, next) => {
  res.setTimeout(3600000, () => {
    // 3600000=> 1h
    next(new AppError("Request Timeout", 499)); // أرسل خطأ عند تجاوز المهلة
  });
  next();
});

//set static folder
app.use("*", express.static("public"));

//session middleware

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // لازم true مع https
      sameSite: "none", // ضروري مع دومينات مختلفة
      maxAge: 24 * 60 * 60 * 1000, // يوم كامل
    },
  })
);

//express-validator middleware
// app.use(expressValidator());

passport.initialize();
localStrategy(passport);
jwtStrategy(passport);

//setup passport middleware
app.use(passport.initialize());
// must setup session passport after setup session appliction
app.use(passport.session());

//defined routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/faq", faqRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/coupons", couponRoutes);

//defined 404 middleware (page not found)
app.all("*", (req, res, next) => {
  // إذا قمنا بتمرير قيمة لnext فإنه يعتبرها رسالة خطأ ويقوم بإعدام جميع البرامج الوسيطة
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// handle Error
app.use(globalError);

module.exports = server;
