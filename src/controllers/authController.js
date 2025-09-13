const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");
const { OAuth2Client } = require("google-auth-library");
const Email = require("./../utils/sendEmils");
const { promisify } = require("util");
const bcrypt = require("bcryptjs");

// cookie config
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 24 * 60 * 60 * 1000, // 24 ساعة
  domain: ".digitalustadacademy.com", // ✅ يخلي الكوكي مشترك بين الـ subdomain
  path: "/",
};
//upload img for users
const multer = require("multer");
const sharp = require("sharp");
const cloudinary = require("./../config/cloudinary");
const { jwt_secret, jwt_expiration_time } = require("../config/config");

const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an imag please uplaod only image ", 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadImageUser = upload.single("thumbnail");

exports.uploadUsingClodinary = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError("Please upload img", 404));
  }

  // رفع كل صورة إلى Cloudinary والحصول على روابط الصور

  const file = req.file;

  // تعديل حجم الصورة باستخدام Sharp
  const resizedImageBuffer = await sharp(file.buffer)
    .resize(500, 500) // تعديل الحجم (مثال 800x800 بكسل)
    .toBuffer(); // تحويل الصورة المعدلة إلى buffer

  // رفع الصورة إلى Cloudinary
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "image" },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    stream.end(resizedImageBuffer);
  });

  // حفظ الرابط في المصفوفة

  req.body.thumbnail = result.secure_url;
  next();
});

const createToken = (user) => {
  const token = jwt.sign({ id: user.id }, jwt_secret, {
    expiresIn: jwt_expiration_time,
  });
  return token;
};

exports.loginUser = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError("يرجى إدخال البريد الإلكتروني وكلمة المرور", 400));
  }
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new AppError("البريد الإلكتروني غير مسجل", 400));
  }
  const isPasswordCorrect = await bcrypt.compare(password, user.password);
  if (!isPasswordCorrect) {
    return next(new AppError("كلمة المرور خاطئة", 400));
  }
  if (!user.active) {
    return next(
      new AppError(
        "الحساب غير مفعل حاليا، الرجاء التواصل مع الدعم لتفعيله",
        400
      )
    );
  }
  const token = createToken(user);
  res.cookie("token", token, cookieOptions);
  console.log("your token is ", token);
  const userResponse = user.toObject ? user.toObject() : { ...user };
  delete userResponse.password;

  res.status(200).json({
    status: "تم تسجيل الدخول بنجاح",
    user: userResponse,
  });
});

exports.signup = catchAsync(async (req, res, next) => {
  req.body.role = "student";
  req.body.balance = 0;
  const user = await User.create(req.body);

  // TODO: don't forget to implement send Email
  // await new Email(user);

  const token = createToken(user);
  res.cookie("token", token, cookieOptions);
  res.status(200).json({
    message: "نجاح",
    user,
  });
});

exports.logout = catchAsync(async (req, res, next) => {
  res.cookie("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" ? true : false,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    domain: ".digitalustadacademy.com", // ✅ يخلي الكوكي مشترك بين الـ subdomain
    path: "/",
    expires: new Date(0), // منتهي الصلاحية
  });

  res.status(200).json({ message: "تم تسجيل الخروج بنجاح" });
});

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://api.digitalustadacademy.com/api/auth/google/callback"
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
      thumbnail: payload.picture,
    });
  }
  if (!user.active) {
    return next(
      new AppError(
        "الحساب غير مفعل حاليا، الرجاء التواصل مع الدعم لتفعيله",
        400
      )
    );
  }
  const token = createToken(user);
  res.cookie("token", token, cookieOptions);

  res.redirect(
    `https://www.digitalustadacademy.com/auth/callback?token=${token}`
  );
});

exports.prmission = catchAsync(async (req, res, next) => {
  let token;
  // if (req.headers.authorization) {
  //   token = req.headers.authorization.split(" ")[1];
  // }
  console.log("\n🔍 DEBUG /api/users/me:");
  console.log("📨 Method:", req.method);
  console.log("🔗 URL:", req.url);
  console.log("🍪 Cookies:", req.cookies);
  console.log("📋 Headers:", {
    authorization: req.headers.authorization,
    cookie: req.headers.cookie,
    origin: req.headers.origin,
    "user-agent": req.headers["user-agent"],
  });
  // التحقق من مصدر الطلب
  const userAgent = req.headers["user-agent"];
  if (userAgent === "node" || userAgent === "NextJS-Middleware") {
    console.log(
      "📡 Request from:",
      userAgent === "node" ? "Server/Middleware" : "NextJS Middleware"
    );
  } else {
    console.log("🌐 Request from: Browser");
  }
  // using cookie
  console.log("Cookies:", req.cookies);
  if (req.cookies?.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization?.startsWith("Bearer")) {
    console.log("Cookies:", req.headers.authorization);

    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new AppError("Not authorized to access this route", 401));
  }

  const decoded = await promisify(jwt.verify)(token, jwt_secret);

  const user = await User.findById(decoded.id);

  // in next time add change password after and return un unauthorized msg

  if (!user) {
    return next(new AppError("Invalid token", 401));
  }
  if (decoded.exp < Date.now() / 1000) {
    return next(new AppError("Token has expired", 401));
  }
  req.user = user;
  next();
}); //for add permissions with jwt

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // `roles` is an array of roles allowed to access the route, e.g., ['admin', 'lead-guide']
    if (!roles.includes(req.user.role)) {
      // If the user's role is not in the allowed roles array, send a forbidden error
      return next(
        new AppError("You do not have permission to access this route", 403)
      );
    }
    // If the user's role is in the allowed roles array, proceed to the next middleware or route handler
    next();
  };
};

exports.forgetPassword = catchAsync(async (req, res, next) => {
  const email = req.body.email;

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  console.log(Date.now());

  const resetLink = `https://www.digitalustadacademy.com/reset-password/${user.resetPasswordToken}`;

  try {
    await new Email(user, resetLink).resetPassword();
    res.status(200).json({ message: "تحقق من رسائل في بريديك الإلكتروني " });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError("فشل في إسترجاع كلمة المرور", 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const resetToken = req.params.resetToken;
  const { password, passwordConfirm } = req.body;
  if (password !== passwordConfirm) {
    return next(new AppError("Passwords do not match", 400));
  }
  const user = await User.findOne({
    resetPasswordToken: resetToken,
    resetPasswordExpires: { $gt: Date.now() },
  });
  if (!user) {
    return next(new AppError("Token expired or invalid", 400));
  }
  user.password = password;
  user.passwordConfirm = undefined;
  user.resetPasswordToken = undefined; // مسح الرمز بعد التغيير
  user.resetPasswordExpires = undefined; // مسح تاريخ الصلاحية

  const token = createToken(user);

  await user.save({ validateBeforeSave: false });
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" ? true : false,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000,
  });
  res.status(200).json({ message: "Password reset successful" });
});
