const fs = require("fs");
const multer = require("multer");
// const path = require("path");
const axios = require("axios");
const AppError = require("./appError");
// config multer
// using in Render Only
const uploadDir = "/tmp/uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDir);
  },
  filename: (req, file, callback) => {
    // إنشاء اسم ملف فريد لمنع تداخل الأسماء
    // استخدام timestamp (الوقت الحالي) واسم الملف الأصلي هو طريقة شائعة
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    callback(
      null,
      file.fieldname +
        "-" +
        uniqueSuffix +
        "." +
        file.originalname.split(".").pop(),
    );
  },
});
const baseUrl = process.env.BASE_URL;

const upload = multer({
  storage: storage,
});
exports.setUploads = upload.single("file");

const videoLibraryId = process.env.VIDEO_LIBRARY_ID;
const bunnyApiKey = process.env.BUNNY_API_KEY;

const safeUnlink = (filePath) => {
  if (!filePath) return;
  fs.unlink(filePath, () => {});
};

exports.uploadVideo = async (title, file) => {
  if (!file?.path) {
    throw new AppError("يرجى تحميل ملف الفيديو في الحقل file", 400);
  }

  if (!title) {
    throw new AppError("يرجى إضافة عنوان الفيديو", 400);
  }

  if (!baseUrl || !videoLibraryId || !bunnyApiKey) {
    throw new AppError("إعدادات رفع الفيديو غير مكتملة على الخادم", 500);
  }

  try {
    const fetchVideoId = await axios.post(
      `${baseUrl}/library/${videoLibraryId}/videos`,
      {
        title: title,
      },
      {
        headers: {
          AccessKey: bunnyApiKey,
          "Content-Type": "application/json",
        },
        timeout: 120000,
      },
    );
    const videoId = fetchVideoId.data.guid;

    const uploadUrl = `${baseUrl}/library/${videoLibraryId}/videos/${videoId}`;
    // read the file
    const fileContent = fs.readFileSync(file.path);

    const video = await axios.put(uploadUrl, fileContent, {
      // upload the file to my Library
      headers: {
        AccessKey: bunnyApiKey,
        "Content-Type": "application/octet-stream",
      },
      maxBodyLength: Infinity,
      timeout: 0,
    });
    const videoDetailsResponse = await axios.get(
      `${baseUrl}/library/${videoLibraryId}/videos/${videoId}`,
      {
        headers: {
          AccessKey: bunnyApiKey,
        },
        timeout: 120000,
      },
    );

    const videoDetails = videoDetailsResponse.data;
    const videoFormat = videoDetails.mediaType; // تنسيق الفيديو
    const videoDuration = videoDetails.length;
    return {
      videoId,
      videoFormat,
      videoDuration,
    };
  } catch (error) {
    if (error.code === "EAI_AGAIN") {
      throw new AppError(
        "فشل رفع الفيديو: تعذر الوصول إلى video.bunnycdn.com (DNS). تحقق من DNS والاتصال بالإنترنت على الخادم",
        503,
      );
    }

    const details =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.response?.data?.Error ||
      error.message ||
      "خطأ غير معروف أثناء رفع الفيديو";

    throw new AppError(`فشل رفع الفيديو: ${details}`, 502);
  } finally {
    safeUnlink(file.path);
  }
};
exports.removeVideo = async (videoId) => {
  try {
    const res = await axios.delete(
      `${baseUrl}/library/${videoLibraryId}/videos/${videoId}`,
      {
        headers: {
          AccessKey: bunnyApiKey,
          "Content-Type": "application/json",
        },
      },
    );
    return true;
  } catch (error) {
    console.log("Error When Deleting Video", error);
    return false;
  }
};
exports.analytics = async () => {};
