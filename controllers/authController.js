const passport = require("passport");
const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");
const { OAuth2Client } = require("google-auth-library");

const createToken = (user) => {
  const token = jwt.sign({ id: user.id }, "your_jwt_secret", {
    expiresIn: "1h",
  });
  return token;
};

exports.loginUser = (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(400).json({ error: info.message });
    }

    const token = createToken(user);

    req.logIn(user, (err) => {
      if (err) return next(err);
      return res
        .status(200)
        .json({ message: "تم تسجيل الدخول بنجاح", token, user });
    });
  })(req, res, next);
};

exports.signUpUser = catchAsync(async (req, res, next) => {
  const { username, password, email, passwordConfirm } = req.body;
  console.log("before Check");
  // التحقق من صحة المدخلات
  if (!username || !password || !email || !passwordConfirm) {
    return next(new AppError("يرجى إدخال جميع الحقول", 400));
  }

  console.log("after Check");

  // تحقق من وجود المستخدم
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return next(new AppError("اسم المستخدم موجود بالفعل", 404));
  }

  // تشفير كلمة المرور
  const hashedPassword = await bcrypt.hash(password, 10);

  // إنشاء مستخدم جديد
  const newUser = new User({
    username,
    email,
    password: hashedPassword,
  });

  // حفظ المستخدم في قاعدة البيانات
  await newUser.save();

  const token = createToken(newUser);

  // استجابة نجاح
  res.status(201).json({ message: "تم التسجيل بنجاح", token, user: newUser });

  res.status(201).json({ message: "تم التسجيل بنجاح" });
});

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:5000/api/auth/google/callback"
);

exports.redirectGoogle = catchAsync(async (req, res, next) => {
  const redirectUrl = client.generateAuthUrl({
    access_type: "offline",
    scope: ["profile", "email"],
  });
  res.redirect(redirectUrl);
});

exports.loginWithGoogle = catchAsync(async (req, res, next) => {
  const code = req.query.code;

  if (!code) {
    return next(new AppError("Authorization code is missing", 400));
  }
  // change code => token
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();

  let user = await User.findOne({ googleId: payload.sub });

  if (!user) {
    // إذا لم يكن المستخدم موجودًا، أنشئ حسابًا جديدًا
    user = await User.create({
      googleId: payload.sub,
      username: payload.name,
      email: payload.email,
      photo: payload.picture,
    });
  }

  const token = createToken(user);

  res.status(201).json({
    message: "succse",
    token: token,
    user,
  });
});

exports.prmission = passport.authenticate("jwt", { session: false }); //for add permissions with jwt
