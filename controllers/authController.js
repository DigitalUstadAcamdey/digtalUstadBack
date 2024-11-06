const passport = require("passport");
const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");

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

exports.loginWithGithub = async (req, res) => {
  let user;
  try {
    user = await User.findOne({ githubId: req.user.githubId });

    if (!user) {
      user = await User.create({
        githubId: req.user.githubId,
        username: req.user.username,
        thumbnail: req.user.thumbnail,
      });
    }
    const token = createToken(user);
    res.status(200).json({
      message: "success",
      token,
      user: {
        username: user.username,
        thumbnail: user.thumbnail,
      },
    });
  } catch (error) {
    console.error("Error during GitHub callback:", error);
    res.redirect("/");
  }
};

exports.loginWithGoogle = async (req, res) => {
  try {
    const user = await User.findOne({ googleId: req.user.googleId });
    if (!user) {
      user = await User.create({
        googleId: req.user.googleId,
        username: req.user.username,
        thumbnail: req.user.thumbnail,
        email: req.user.email,
      });
    }
    const token = createToken(user);
    res.status(200).json({
      message: "success",
      token: token,
      user: {
        username: user.username,
        thumbnail: user.thumbnail,
      },
    });
  } catch (error) {
    console.log(error);
  }
};

exports.prmission = passport.authenticate("jwt", { session: false }); //for add permissions with jwt
