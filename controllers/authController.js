const passport = require("passport");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");
const { OAuth2Client } = require("google-auth-library");
const sendEmail = require("./../utils/sendEmils");
const { promisify } = require("util");

//upload img for users
const multer = require("multer");
const sharp = require("sharp");
const cloudinary = require("./../config/cloudinary");

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
  const token = jwt.sign({ id: user.id }, "your_jwt_secret", {
    expiresIn: "4h",
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

exports.signup = catchAsync(async (req, res, next) => {
  const user = await User.create(req.body);

  const token = createToken(user);
  res.status(200).json({
    message: "نجاح",
    token,
    user,
  });
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
      thumbnail: payload.picture,
    });
  }

  const token = createToken(user);

  res.redirect(`http://localhost:3000/auth/callback?token=${token}`);
  // res.status(201).json({
  //   message: "succse",
  //   token: token,
  //   user,
  // });
});

exports.prmission = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return next(new AppError("Not authorized to access this route", 401));
  }
  const decoded = await promisify(jwt.verify)(token, "your_jwt_secret");

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

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  console.log(user);
  console.log(Date.now());

  const resetLink = `${process.env.URL}/api/auth/reset-password/${user.resetPasswordToken}`;

  const options = {
    email,
    subject: "Reset Password",
    message: `You are receiving this email because you (or someone else) have requested a password reset. Please click on the following link to complete the process: \n\n${resetLink}\n\nIf you did not request a password reset, please ignore this email and your password will remain unchanged.\n`,
  };

  try {
    console.log("first");
    await sendEmail(options);
    res.status(200).json({ message: "Reset password email sent" });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError("Failed to send email", 500));
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

  res.status(200).json({ message: "Password reset successful", token });
});
