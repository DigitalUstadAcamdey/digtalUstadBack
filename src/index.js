const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
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
const notificationRoutes = require("./routes/notification.route")

const app = express();

app.set('trust proxy', 1); //  for traefik proxy


//setup socket.io
const server = http.createServer(app);

app.use(helmet({
  // disable some Rules
  crossOriginResourcePolicy: { policy: "cross-origin" }, // enable the imgs , videos , other files form difreent
    crossOriginEmbedderPolicy: false, // allow the iframes , videos in Frontend 
    contentSecurityPolicy: false, // disable the CSP
}));

//cors
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://e-learning-platform-eosin.vercel.app",
      "https://www.digitalustadacademy.com",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
  })
);

// for all routes
const generalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hours
  max: 300, 
  message: {
    status: "fail",
    message: "Too many requests from this IP. Please try again later."
  },
});

// for login/signup/spam sensitive routes
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, 
  message: "Too many login attempts. Try again in 5 minutes.",
});

if (process.env.NODE_ENV === "production") {
  app.use("/api", generalLimiter);
  // can add signup , forget and rest password
  app.use("/api/auth/login", authLimiter);
}

app.use(express.json({ limit: "10kb" }));

const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://e-learning-platform-eosin.vercel.app",
      "https://www.digitalustadacademy.com",
    ],
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

// allowed cookies
app.use(cookieParser());

app.use(mongoSanitize()); // No sql injection
app.use(xss()); // ضد XSS
app.use(hpp());

app.use((req, res, next) => {
  res.setTimeout(3600000, () => {
    // 3600000=> 1h
    next(new AppError("Request Timeout", 499)); 
  });
  next();
});

//set static folder
app.use("*", express.static("public"));

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
app.use("/api/notification", notificationRoutes)
//defined 404 middleware (page not found)
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// handle Error
app.use(globalError);

module.exports = server;
