const PLATFORM_ROLES = Object.freeze([
  "user",
  "support_agent",
  "moderator",
  "platform_admin",
]);

const USER_STATUSES = Object.freeze([
  "active",
  "suspended",
  "deleted",
]);

const DEFAULT_PLATFORM_ROLE = "user";
const DEFAULT_USER_STATUS = "active";

module.exports = {
  PLATFORM_ROLES,
  USER_STATUSES,
  DEFAULT_PLATFORM_ROLE,
  DEFAULT_USER_STATUS,
};
