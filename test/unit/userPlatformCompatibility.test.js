const assert = require("node:assert/strict");
const test = require("node:test");
const {
  forceDefaultPlatformRole,
  applySignupPlatformDefaults,
  containsProtectedSelfServicePlatformField,
  containsPlatformRoleField,
  normalizeLegacyAccountStatusUpdate,
} = require("../../src/utils/userPlatformCompatibility");

test("signup platform defaults override client-supplied privilege fields", () => {
  const body = {
    role: "student",
    platformRole: "platform_admin",
    status: "deleted",
  };

  applySignupPlatformDefaults(body);

  assert.equal(body.role, "student");
  assert.equal(body.platformRole, "user");
  assert.equal(body.status, "suspended");
});

test("admin-created users cannot receive a client-supplied platform role", () => {
  const body = {
    role: "teacher",
    platformRole: "platform_admin",
  };

  forceDefaultPlatformRole(body);

  assert.equal(body.role, "teacher");
  assert.equal(body.platformRole, "user");
});

test("self-service updates detect platform fields by presence", () => {
  assert.equal(
    containsProtectedSelfServicePlatformField({ platformRole: null }),
    true,
  );
  assert.equal(
    containsProtectedSelfServicePlatformField({ status: "" }),
    true,
  );
  assert.equal(
    containsProtectedSelfServicePlatformField({ username: "Updated" }),
    false,
  );
});

test("legacy admin updates cannot include a platform role", () => {
  assert.equal(containsPlatformRoleField({ platformRole: null }), true);
  assert.equal(containsPlatformRoleField({ active: false }), false);
});

test("legacy active updates receive a compatible status when omitted", () => {
  assert.deepEqual(
    normalizeLegacyAccountStatusUpdate({ active: true }),
    {
      active: true,
      status: "active",
    },
  );
  assert.deepEqual(
    normalizeLegacyAccountStatusUpdate({ active: false }),
    {
      active: false,
      status: "suspended",
    },
  );
});

test("an explicit valid status is not overwritten by active normalization", () => {
  assert.deepEqual(
    normalizeLegacyAccountStatusUpdate({
      active: false,
      status: "deleted",
    }),
    {
      active: false,
      status: "deleted",
    },
  );
});
