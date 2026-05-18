const AppSetting = require("../models/appSettingModel");
const AppError = require("./appError");
const { subscriptionPrice: fallbackSubscriptionPrice } = require("../config/config");

const SUBSCRIPTION_PRICE_KEY = "yearlySubscriptionPrice";

const normalizePrice = (price, statusCode = 500) => {
  const numericPrice = Number(price);

  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    throw new AppError("سعر الاشتراك السنوي غير صالح", statusCode);
  }

  return numericPrice;
};

exports.SUBSCRIPTION_PRICE_KEY = SUBSCRIPTION_PRICE_KEY;

exports.getAnnualSubscriptionPrice = async () => {
  const setting = await AppSetting.findOne({ key: SUBSCRIPTION_PRICE_KEY })
    .select("value")
    .lean();

  const price =
    setting?.value !== undefined ? setting.value : fallbackSubscriptionPrice;

  return normalizePrice(price);
};

exports.normalizeSubscriptionPriceInput = (price) => normalizePrice(price, 400);
