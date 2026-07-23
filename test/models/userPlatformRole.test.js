const assert = require("node:assert/strict");
const test = require("node:test");
const User = require("../../src/models/userModel");
const {
  PLATFORM_ROLES,
  USER_STATUSES,
} = require("../../src/utils/platformRoles");

const createValidUser = (overrides = {}) =>
  new User({
    username: "Compatibility User",
    email: "compatibility-user@example.com",
    password: "password123",
    passwordConfirm: "password123",
    ...overrides,
  });

test("new users default to the legacy student role and platform user role", () => {
  const user = createValidUser();

  assert.equal(user.role, "student");
  assert.equal(user.platformRole, "user");
  assert.equal(user.active, true);
  assert.equal(user.status, "active");
  assert.equal(user.validateSync(), undefined);
});

test("legacy Academy roles remain independent from platform roles", () => {
  for (const role of ["student", "teacher", "admin"]) {
    const user = createValidUser({
      email: `${role}@example.com`,
      role,
    });

    assert.equal(user.role, role);
    assert.equal(user.platformRole, "user");
    assert.equal(user.validateSync(), undefined);
  }
});

test("new inactive users default to a suspended platform status", () => {
  const user = createValidUser({
    email: "inactive@example.com",
    active: false,
  });

  assert.equal(user.active, false);
  assert.equal(user.status, "suspended");
  assert.equal(user.validateSync(), undefined);
});

test("all required platform roles and user statuses validate", () => {
  for (const platformRole of PLATFORM_ROLES) {
    const user = createValidUser({
      email: `${platformRole}@example.com`,
      platformRole,
    });

    assert.equal(user.validateSync(), undefined);
  }

  for (const status of USER_STATUSES) {
    const user = createValidUser({
      email: `${status}-status@example.com`,
      status,
    });

    assert.equal(user.validateSync(), undefined);
  }
});

test("unknown platform roles and statuses fail validation", () => {
  const user = createValidUser({
    platformRole: "owner",
    status: "invited",
  });
  const validationError = user.validateSync();

  assert.ok(validationError.errors.platformRole);
  assert.ok(validationError.errors.status);
});

test("the platform role and status administrative index is declared", () => {
  const hasPlatformIndex = User.schema.indexes().some(([fields]) =>
    fields.platformRole === 1 && fields.status === 1
  );

  assert.equal(hasPlatformIndex, true);
});
