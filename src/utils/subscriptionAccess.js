const Subscription = require("../models/subscriptionModel");

const activeAnnualSubscriptionFilter = (userId) => ({
  user: userId,
  status: "active",
  endDate: { $gt: new Date() },
});

const findActiveAnnualSubscription = (userId) =>
  Subscription.findOne(activeAnnualSubscriptionFilter(userId)).sort({
    endDate: -1,
  });

const isAnnualSubscriptionActive = (subscription) =>
  Boolean(
    subscription &&
      subscription.status === "active" &&
      subscription.endDate &&
      new Date(subscription.endDate) > new Date(),
  );

const buildAnnualSubscriptionAccess = (subscription) => {
  const isActive = isAnnualSubscriptionActive(subscription);

  return {
    plan: "annual",
    isActive,
    accessScope: isActive ? "all_courses" : "none",
    requiresCourseEnrollment: false,
    startedAt: subscription?.startDate || null,
    expiresAt: subscription?.endDate || null,
  };
};

const hasObjectId = (values = [], targetId) =>
  values.some((value) => {
    const id = value?._id || value;
    return id?.toString() === targetId?.toString();
  });

module.exports = {
  activeAnnualSubscriptionFilter,
  findActiveAnnualSubscription,
  isAnnualSubscriptionActive,
  buildAnnualSubscriptionAccess,
  hasObjectId,
};
