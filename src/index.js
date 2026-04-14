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
const notificationRoutes = require("./routes/notification.route");
const subscriptionRoutes = require("./routes/subscritption.route");
const chargilyRoutes = require("./routes/chargily.route");
const { addWebhook } = require("./controllers/chargily.controller");
const todoRoutes = require("./routes/todo.route");

const app = express();

const normalizeOrigin = (origin = "") =>
  origin.replace(/\/$/, "").toLowerCase();

const allowedOrigins = [
  "http://localhost:3000",
  "https://e-learning-platform-eosin.vercel.app",
  "https://www.digitalustadacademy.com",
  "https://digitalustadacademy.com",
  "https://quiet-bats-tap.loca.lt",
  "https://1686134b9a15.ngrok-free.app",
];

const allowedOriginsSet = new Set(allowedOrigins.map(normalizeOrigin));

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  const normalized = normalizeOrigin(origin);

  if (allowedOriginsSet.has(normalized)) return true;

  // Allow all HTTPS subdomains of digitalustadacademy.com in production.
  return /^https:\/\/([a-z0-9-]+\.)?digitalustadacademy\.com$/i.test(
    normalized,
  );
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin"],
  exposedHeaders: ["Set-Cookie"],
  preflightContinue: false,
  optionsSuccessStatus: 200,
};

const corsAllowedHeaders =
  "Content-Type, Authorization, Accept, Origin, X-Requested-With";

// for reading req.body
app.post("/api/chargily/webhook", express.raw({ type: "*/*" }), addWebhook);

app.set("trust proxy", 1); //  for traefik proxy

//setup socket.io
const server = http.createServer(app);

app.use(
  helmet({
    // disable some Rules
    crossOriginResourcePolicy: { policy: "cross-origin" }, // enable the imgs , videos , other files form difreent
    crossOriginEmbedderPolicy: false, // allow the iframes , videos in Frontend
    contentSecurityPolicy: false, // disable the CSP
  }),
);

// cors
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (isAllowedOrigin(origin)) {
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
    }

    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,PATCH,OPTIONS",
    );
    res.header("Access-Control-Allow-Headers", corsAllowedHeaders);
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// for all routes
const generalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hours
  max: 300,
  message: {
    status: "fail",
    message: "Too many requests from this IP. Please try again later.",
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
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
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
app.use("/api/notification", notificationRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/chargily", chargilyRoutes);
app.use("/api/todos", todoRoutes);

//set static folder
app.use(express.static("public"));

//defined 404 middleware (page not found)
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// handle Error
app.use(globalError);

module.exports = server;
