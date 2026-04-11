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

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (error) => {
  const status = error?.response?.status;
  const code = error?.code;

  if (status && status >= 500) return true;

  return [
    "ETIMEDOUT",
    "ECONNRESET",
    "ECONNREFUSED",
    "EAI_AGAIN",
    "ENOTFOUND",
    "ERR_NETWORK",
  ].includes(code);
};

const withRetry = async (
  fn,
  { retries = 2, delayMs = 1200, label = "request" } = {},
) => {
  let lastError;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error) || attempt > retries) {
        break;
      }

      console.warn(
        `[uploadVideo] Retry ${attempt}/${retries} for ${label}. code=${error.code || "N/A"} status=${error.response?.status || "N/A"}`,
      );
      await wait(delayMs * attempt);
    }
  }

  throw lastError;
};

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
    let stage = "create-video";
    const fetchVideoId = await withRetry(
      () =>
        axios.post(
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
        ),
      { retries: 2, label: stage },
    );
    const videoId = fetchVideoId.data.guid;

    const uploadUrl = `${baseUrl}/library/${videoLibraryId}/videos/${videoId}`;
    stage = "upload-binary";
    await withRetry(
      () => {
        const stream = fs.createReadStream(file.path);
        return axios.put(uploadUrl, stream, {
          headers: {
            AccessKey: bunnyApiKey,
            "Content-Type": "application/octet-stream",
            "Content-Length": file.size || fs.statSync(file.path).size,
          },
          maxBodyLength: Infinity,
          timeout: 10 * 60 * 1000,
        });
      },
      { retries: 2, label: stage },
    );

    stage = "get-video-details";
    const videoDetailsResponse = await withRetry(
      () =>
        axios.get(`${baseUrl}/library/${videoLibraryId}/videos/${videoId}`, {
          headers: {
            AccessKey: bunnyApiKey,
          },
          timeout: 120000,
        }),
      { retries: 2, label: stage },
    );

    const videoDetails = videoDetailsResponse.data;
    const videoFormat = videoDetails.mediaType || "unknown"; // تنسيق الفيديو
    const videoDuration = videoDetails.length;
    return {
      videoId,
      videoFormat,
      videoDuration,
    };
  } catch (error) {
    console.error("[uploadVideo] Failed", {
      code: error.code,
      status: error.response?.status,
      message: error.message,
      bunnyMessage:
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.response?.data?.Error,
      fileName: file?.originalname,
      fileSize: file?.size,
    });

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
