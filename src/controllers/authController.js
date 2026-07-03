const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");
const { OAuth2Client } = require("google-auth-library");
const Email = require("./../utils/sendEmails");
const { promisify } = require("util");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { buildDeviceSession } = require("../utils/deviceSession");

// cookie config
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 24 * 60 * 60 * 1000 * 30, // 1month
  domain: process.env.COOKIE_DOMAIN || ".digitalustadacademy.com",
  path: "/",
};
//upload img for users
const multer = require("multer");
const sharp = require("sharp");
const cloudinary = require("./../config/cloudinary");
const { jwt_secret, jwt_expiration_time } = require("../config/config");
const config = require("../config/config");

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
      { resource_type: "image", folder: "users_imgs" },
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

const sanitizeUser = (user) => {
  const userResponse = user.toObject ? user.toObject() : { ...user };
  delete userResponse.password;
  delete userResponse.passwordConfirm;
  return userResponse;
};

const escapeRegExp = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findUserByEmailInsensitive = (email) => {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) return null;

  return User.findOne({
    email: {
      $regex: `^${escapeRegExp(normalizedEmail)}$`,
      $options: "i",
    },
  });
};

const createToken = (user, sessionId) => {
  const token = jwt.sign({ id: user.id, sessionId }, jwt_secret, {
    expiresIn: jwt_expiration_time,
  });
  return token;
};

const attachSessionToUser = async (user, req) => {
  const session = await buildDeviceSession(req);

  user.lastLogin = new Date();
  user.loggedInDevices = [session, ...(user.loggedInDevices || [])].slice(0, 10);

  await user.save({ validateBeforeSave: false });

  return session;
};

const removeSessionFromUser = async (userId, sessionId) => {
  if (!sessionId) return;

  await User.findByIdAndUpdate(userId, {
    $pull: {
      loggedInDevices: { sessionId },
    },
  });
};

exports.loginUser = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const normalizedEmail = email?.trim().toLowerCase();

  if (!email || !password) {
    return next(new AppError("يرجى إدخال البريد الإلكتروني وكلمة المرور", 400));
  }
  const user = await findUserByEmailInsensitive(normalizedEmail).select(
    "+password"
  );

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
  const session = await attachSessionToUser(user, req);
  const token = createToken(user, session.sessionId);
  res.cookie("token", token, cookieOptions);

  res.status(200).json({
    status: "تم تسجيل الدخول بنجاح",
    token,
    session: {
      sessionId: session.sessionId,
      browser: session.browser,
      os: session.os,
      deviceType: session.deviceType,
      location: session.location,
      ipAddress: session.ipAddress,
      loginAt: session.loginAt,
    },
    user: sanitizeUser(user),
  });
});

exports.signup = catchAsync(async (req, res, next) => {
  if (req.body.email) {
    req.body.email = req.body.email.trim().toLowerCase();
  }

  req.body.role = "student";
  req.body.balance = 0;
  req.body.active = false;
  const user = await User.create(req.body);

  // TODO: don't forget to implement send Email
  // await new Email(user);
  const verifyToken = user.createEmailVerifyToken();
  await user.save({ validateBeforeSave: false });

  // const verifyURL = `${req.protocol}://${req.get("host")}/api/auth/verify-email/${verifyToken}`;
  // client link to verify email
  const verifyURL = `${config.client_url}/auth/check-email/${verifyToken}`;


  await new Email(user, verifyURL).sendEmailVerification();

  res.status(200).json({
    message: "تم إرسال رابط التحقق إلى بريدك الإلكتروني. يرجى التحقق لتفعيل الحساب.",
  });
});

exports.logout = catchAsync(async (req, res, next) => {
  let token;

  if (req.cookies?.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (token) {
    try {
      const decoded = await promisify(jwt.verify)(token, jwt_secret);
      await removeSessionFromUser(decoded.id, decoded.sessionId);
    } catch (error) {
      // Ignore invalid/expired tokens during logout so cookie cleanup still works.
    }
  }

  res.cookie("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" ? true : false,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    domain: process.env.COOKIE_DOMAIN || ".digitalustadacademy.com", // ✅ يخلي الكوكي مشترك بين الـ subdomain
    path: "/",
    expires: new Date(0), // منتهي الصلاحية
  });

  res.status(200).json({ message: "تم تسجيل الخروج بنجاح" });
});

exports.getMySessions = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("loggedInDevices");

  res.status(200).json({
    message: "Active sessions fetched successfully",
    currentSessionId: req.sessionId || null,
    sessions: (user?.loggedInDevices || []).map((session) => ({
      sessionId: session.sessionId,
      browser: session.browser,
      os: session.os,
      deviceType: session.deviceType,
      location: session.location,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      loginAt: session.loginAt,
      lastActiveAt: session.lastActiveAt,
      isCurrent: session.sessionId === req.sessionId,
    })),
  });
});

exports.logoutSession = catchAsync(async (req, res, next) => {
  const sessionId = req.params.sessionId;
  const user = await User.findById(req.user.id).select("loggedInDevices");

  const sessionExists = user?.loggedInDevices?.some(
    (session) => session.sessionId === sessionId
  );

  if (!sessionExists) {
    return next(new AppError("Session not found", 404));
  }

  await removeSessionFromUser(req.user.id, sessionId);

  const response = {
    message: "Session logged out successfully",
  };

  if (sessionId === req.sessionId) {
    res.cookie("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" ? true : false,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      domain: process.env.COOKIE_DOMAIN || ".digitalustadacademy.com",
      path: "/",
      expires: new Date(0),
    });
    response.currentSessionLoggedOut = true;
  }

  res.status(200).json(response);
});

exports.logoutAllSessions = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, {
    $set: {
      loggedInDevices: [],
    },
  });

  res.cookie("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" ? true : false,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    domain: process.env.COOKIE_DOMAIN || ".digitalustadacademy.com",
    path: "/",
    expires: new Date(0),
  });

  res.status(200).json({
    message: "All sessions logged out successfully",
  });
});


exports.verifyEmail = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    emailVerifyToken: hashedToken,
    emailVerifyExpires: { $gt: Date.now() },
  });

  if (!user) return next(new AppError("Token invalid or expired", 400));

  user.active = true;
  user.emailVerifyToken = undefined;
  user.emailVerifyExpires = undefined;

  await user.save({
    validateBeforeSave: false,
  });

  res.status(200).json({ message: "Email verified successfully" });
});
exports.resendVerificationEmail = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const normalizedEmail = email?.trim().toLowerCase();

  const user = await findUserByEmailInsensitive(normalizedEmail);
  if (!user) {
    return next(new AppError("User not found", 404));
  }
  if (user.active) {
    return next(new AppError("Email is already verified", 400));
  }
  const verifyToken = user.createEmailVerifyToken();
  await user.save({ validateBeforeSave: false });
  const verifyURL = `${config.client_url}/auth/check-email/${verifyToken}`;
  await new Email(user, verifyURL).sendEmailVerification();
  res.status(200).json({ message: "تم إعادة إرسال بريد التحقق بنجاح" });
});


const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  (process.env.API_URL || "https://api.digitalustadacademy.com") + "/api/auth/google/callback"
);

const getSafeFrontendCallbackUrl = (req) => {
  const candidate =
    req.query?.callbackUrl || req.query?.redirect || req.query?.frontendUrl;

  const fallbackUrl = (process.env.FRONTEND_URL || "https://www.digitalustadacademy.com") + "/auth/callback";

  if (!candidate || typeof candidate !== "string") {
    return fallbackUrl;
  }

  try {
    const parsed = new URL(candidate);
    const safeHostPattern = new RegExp(`(^|\\\\.)${(process.env.FRONTEND_DOMAIN || 'digitalustadacademy.com').replace(/\\./g, '\\\\.')}$`, 'i');

    if (parsed.protocol === "https:" && safeHostPattern.test(parsed.hostname)) {
      return parsed.toString();
    }
  } catch (error) {
    // Ignore invalid URL and use fallback.
  }

  return fallbackUrl;
};

exports.redirectGoogle = catchAsync(async (req, res, next) => {
  const frontendCallback = getSafeFrontendCallbackUrl(req);

  const redirectUrl = client.generateAuthUrl({
    access_type: "offline",
    scope: ["profile", "email"],
    state: Buffer.from(
      JSON.stringify({ frontendCallback }),
      "utf8"
    ).toString("base64url"),
  });
  res.redirect(redirectUrl);
});

exports.loginWithGoogle = catchAsync(async (req, res, next) => {
  const code = req.query.code;
  let frontendCallback = (process.env.FRONTEND_URL || "https://www.digitalustadacademy.com") + "/auth/callback";

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
  const googleEmail = payload?.email?.trim().toLowerCase();

  if (!googleEmail) {
    return next(new AppError("Google account has no email", 400));
  }

  if (!payload?.email_verified) {
    return next(new AppError("Google email is not verified", 400));
  }

  let user = await User.findOne({ googleId: payload.sub });

  if (!user) {
    // Link Google login to an existing local account that has the same email.
    user = await findUserByEmailInsensitive(googleEmail);
  }

  if (!user) {
    // Create a new account only when there is no existing account by Google ID or email.
    user = await User.create({
      googleId: payload.sub,
      username: payload.name,
      email: googleEmail,
      thumbnail: payload.picture,
      active: true,
    });
  } else {
    let shouldSave = false;

    if (!user.googleId) {
      user.googleId = payload.sub;
      shouldSave = true;
    }

    if (payload.picture && !user.thumbnail) {
      user.thumbnail = payload.picture;
      shouldSave = true;
    }

    if (!user.username && payload.name) {
      user.username = payload.name;
      shouldSave = true;
    }

    if (!user.active) {
      user.active = true;
      shouldSave = true;
    }

    if (shouldSave) {
      await user.save({ validateBeforeSave: false });
    }
  }

  if (!user.active) {
    return next(
      new AppError(
        "الحساب غير مفعل حاليا، الرجاء التواصل مع الدعم لتفعيله",
        400
      )
    );
  }
  const session = await attachSessionToUser(user, req);
  const token = createToken(user, session.sessionId);
  res.cookie("token", token, cookieOptions);

  if (req.query.state) {
    try {
      const parsedState = JSON.parse(
        Buffer.from(req.query.state, "base64url").toString("utf8")
      );
      const stateCallback = parsedState?.frontendCallback;

      if (typeof stateCallback === "string") {
        const parsed = new URL(stateCallback);
        if (
          parsed.protocol === "https:" &&
          new RegExp(`(^|\\\\.)${(process.env.FRONTEND_DOMAIN || 'digitalustadacademy.com').replace(/\\./g, '\\\\.')}$`, 'i').test(parsed.hostname)
        ) {
          frontendCallback = parsed.toString();
        }
      }
    } catch (error) {
      // Fallback URL is used when state is invalid.
    }
  }

  const separator = frontendCallback.includes("?") ? "&" : "?";
  res.redirect(`${frontendCallback}${separator}token=${token}`);
});

exports.prmission = catchAsync(async (req, res, next) => {
  let token;

  // using cookie

  if (req.cookies?.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization?.startsWith("Bearer")) {
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

  if (decoded.sessionId) {
    const activeSession = user.loggedInDevices?.find(
      (session) => session.sessionId === decoded.sessionId
    );

    if (!activeSession) {
      return next(new AppError("Session is no longer active", 401));
    }

    activeSession.lastActiveAt = new Date();
    await user.save({ validateBeforeSave: false });
    req.sessionId = decoded.sessionId;
  }

  req.user = user;
  next();
}); //for add permissions with jwt

exports.optionalPrmission = catchAsync(async (req, res, next) => {
  let token;

  if (req.cookies?.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = await promisify(jwt.verify)(token, jwt_secret);
    const user = await User.findById(decoded.id);

    if (!user || decoded.exp < Date.now() / 1000) {
      req.user = null;
      return next();
    }

    if (decoded.sessionId) {
      const activeSession = user.loggedInDevices?.find(
        (session) => session.sessionId === decoded.sessionId
      );

      if (!activeSession) {
        req.user = null;
        return next();
      }

      activeSession.lastActiveAt = new Date();
      await user.save({ validateBeforeSave: false });
      req.sessionId = decoded.sessionId;
    }

    req.user = user;
    return next();
  } catch (error) {
    req.user = null;
    return next();
  }
});

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
  const email = req.body.email?.trim().toLowerCase();

  const user = await findUserByEmailInsensitive(email);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetLink = `${process.env.FRONTEND_URL || "https://www.digitalustadacademy.com"}/reset-password/${user.resetPasswordToken}`;

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
  user.loggedInDevices = [];

  const session = await attachSessionToUser(user, req);
  const token = createToken(user, session.sessionId);

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" ? true : false,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 24 * 60 * 60 * 1000,
  });
  res.status(200).json({ message: "Password reset successful" });
});
