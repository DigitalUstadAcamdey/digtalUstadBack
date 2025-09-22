const express = require("express");
const helmet = require("helmet");
// const rateLimit = require("express-rate-limit");
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

const app = express();
//setup socket.io
const server = http.createServer(app);

app.use(helmet());

//cors
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://e-learning-platform-eosin.vercel.app",
      "https://www.digitalustadacademy.com",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
  })
);

// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 دقيقة
//   max: 100, // كل IP = 100 طلب فقط
// });

app.use("/api", limiter);

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

app.use(mongoSanitize()); // ضد NoSQL injection
app.use(xss()); // ضد XSS
app.use(hpp());

app.use((req, res, next) => {
  res.setTimeout(3600000, () => {
    // 3600000=> 1h
    next(new AppError("Request Timeout", 499)); // أرسل خطأ عند تجاوز المهلة
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

//defined 404 middleware (page not found)
app.all("*", (req, res, next) => {
  // إذا قمنا بتمرير قيمة لnext فإنه يعتبرها رسالة خطأ ويقوم بإعدام جميع البرامج الوسيطة
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// handle Error
app.use(globalError);

module.exports = server;
