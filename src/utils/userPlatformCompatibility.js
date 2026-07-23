const {
  DEFAULT_PLATFORM_ROLE,
} = require("./platformRoles");

const hasOwn = (value, field) =>
  Object.prototype.hasOwnProperty.call(value || {}, field);

const forceDefaultPlatformRole = (body) => {
  body.platformRole = DEFAULT_PLATFORM_ROLE;
  return body;
};

const applySignupPlatformDefaults = (body) => {
  forceDefaultPlatformRole(body);
  body.status = "suspended";
  return body;
};

const containsProtectedSelfServicePlatformField = (body) =>
  hasOwn(body, "platformRole") || hasOwn(body, "status");

const containsPlatformRoleField = (body) =>
  hasOwn(body, "platformRole");

const normalizeLegacyAccountStatusUpdate = (body) => {
  const updates = { ...body };

  if (hasOwn(updates, "active") && !hasOwn(updates, "status")) {
    updates.status = updates.active ? "active" : "suspended";
  }

  return updates;
};

module.exports = {
  forceDefaultPlatformRole,
  applySignupPlatformDefaults,
  containsProtectedSelfServicePlatformField,
  containsPlatformRoleField,
  normalizeLegacyAccountStatusUpdate,
};
