const crypto = require("crypto");
const axios = require("axios");

const GEOLOCATION_TIMEOUT = 2000;
const GEOLOCATION_API_URL =
  process.env.GEOLOCATION_API_URL || "https://ipwho.is";

const getClientIp = (req) => {
  const cloudflareIp = req.headers["cf-connecting-ip"];
  const forwardedFor = req.headers["x-forwarded-for"];
  const candidateIp =
    (cloudflareIp && cloudflareIp.trim()) ||
    (forwardedFor && forwardedFor.split(",")[0].trim()) ||
    req.headers["x-real-ip"] ||
    req.ip ||
    req.connection?.remoteAddress ||
    "unknown";

  return candidateIp.replace(/^::ffff:/, "");
};

const detectDeviceType = (userAgent = "") => {
  const normalized = userAgent.toLowerCase();

  if (!normalized) return "unknown";
  if (/bot|crawl|spider|slurp/.test(normalized)) return "bot";
  if (/tablet|ipad/.test(normalized)) return "tablet";
  if (/mobile|android|iphone/.test(normalized)) return "mobile";
  return "desktop";
};

const detectBrowser = (userAgent = "") => {
  if (!userAgent) return "Unknown Browser";
  if (/edg/i.test(userAgent)) return "Microsoft Edge";
  if (/opr|opera/i.test(userAgent)) return "Opera";
  if (/chrome/i.test(userAgent) && !/edg|opr|opera/i.test(userAgent)) {
    return "Chrome";
  }
  if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
    return "Safari";
  }
  if (/firefox/i.test(userAgent)) return "Firefox";
  if (/msie|trident/i.test(userAgent)) return "Internet Explorer";
  return "Unknown Browser";
};

const detectOs = (userAgent = "") => {
  if (!userAgent) return "Unknown OS";
  if (/windows/i.test(userAgent)) return "Windows";
  if (/android/i.test(userAgent)) return "Android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  if (/mac os x|macintosh/i.test(userAgent)) return "macOS";
  if (/linux/i.test(userAgent)) return "Linux";
  return "Unknown OS";
};

const detectLocationFromHeaders = (req) => {
  const city = req.headers["x-vercel-ip-city"];
  const country =
    req.headers["x-vercel-ip-country"] || req.headers["cf-ipcountry"];

  if (city && country) return `${city}, ${country}`;
  if (country) return `${country}`;
  return null;
};

const isPrivateOrLocalIp = (ipAddress = "") => {
  if (!ipAddress || ipAddress === "unknown") return true;

  return (
    ipAddress === "::1" ||
    ipAddress === "127.0.0.1" ||
    ipAddress.startsWith("10.") ||
    ipAddress.startsWith("192.168.") ||
    ipAddress.startsWith("169.254.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ipAddress) ||
    ipAddress.startsWith("fc") ||
    ipAddress.startsWith("fd") ||
    ipAddress.startsWith("fe80:")
  );
};

const formatGeolocation = (locationData = {}) => {
  const parts = [
    locationData.city,
    locationData.region || locationData.region_name,
    locationData.country || locationData.country_code,
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : "Unknown location";
};

const resolveLocation = async (req, ipAddress) => {
  const headerLocation = detectLocationFromHeaders(req);
  if (headerLocation) return headerLocation;

  if (isPrivateOrLocalIp(ipAddress)) {
    return "Local or private network";
  }

  try {
    const { data } = await axios.get(
      `${GEOLOCATION_API_URL.replace(/\/$/, "")}/${encodeURIComponent(
        ipAddress
      )}`,
      {
        timeout: GEOLOCATION_TIMEOUT,
      }
    );

    if (data?.success === false) {
      return "Unknown location";
    }

    return formatGeolocation(data);
  } catch (error) {
    return "Unknown location";
  }
};

const buildDeviceSession = async (req) => {
  const userAgent = req.headers["user-agent"] || "Unknown user agent";
  const ipAddress = getClientIp(req);

  return {
    sessionId: crypto.randomUUID(),
    ipAddress,
    userAgent,
    browser: detectBrowser(userAgent),
    os: detectOs(userAgent),
    deviceType: detectDeviceType(userAgent),
    location: await resolveLocation(req, ipAddress),
    loginAt: new Date(),
    lastActiveAt: new Date(),
  };
};

module.exports = {
  buildDeviceSession,
};
