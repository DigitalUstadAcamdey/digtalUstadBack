const assert = require("node:assert/strict");
const test = require("node:test");
const mongoose = require("mongoose");
require("dotenv").config();

const {
  getPlatformRoleBackfillCounts,
  applyPlatformRoleBackfill,
} = require("../../src/scripts/backfillPlatformRoles");

test("platform role backfill preserves legacy roles and is idempotent", async (t) => {
  const uri = process.env.MONGODB_TRANSACTION_TEST_URI;

  if (!uri) {
    t.skip("MONGODB_TRANSACTION_TEST_URI is not configured.");
    return;
  }

  const connection = await mongoose
    .createConnection(uri, {
      serverSelectionTimeoutMS: 10000,
    })
    .asPromise();
  const collectionName = `platform_role_backfill_${process.pid}_${Date.now()}`;
  const collection = connection.collection(collectionName);

  t.after(async () => {
    await collection.drop();
    await connection.close();
  });

  await collection.insertMany([
    {
      key: "student",
      role: "student",
      active: true,
    },
    {
      key: "teacher",
      role: "teacher",
      active: true,
    },
    {
      key: "admin",
      role: "admin",
      active: true,
    },
    {
      key: "inactive",
      role: "student",
      active: false,
    },
    {
      key: "existing-platform-role",
      role: "student",
      platformRole: "moderator",
      status: "deleted",
      active: false,
    },
  ]);

  const before = await getPlatformRoleBackfillCounts(collection);

  assert.deepEqual(before, {
    platformRole: 4,
    activeStatus: 3,
    suspendedStatus: 1,
  });

  const firstRun = await applyPlatformRoleBackfill(collection);

  assert.deepEqual(firstRun, {
    platformRole: 4,
    activeStatus: 3,
    suspendedStatus: 1,
  });

  const users = await collection.find({}).sort({ key: 1 }).toArray();
  const usersByKey = Object.fromEntries(
    users.map((user) => [user.key, user]),
  );

  assert.equal(usersByKey.student.role, "student");
  assert.equal(usersByKey.teacher.role, "teacher");
  assert.equal(usersByKey.admin.role, "admin");
  assert.equal(usersByKey.student.platformRole, "user");
  assert.equal(usersByKey.teacher.platformRole, "user");
  assert.equal(usersByKey.admin.platformRole, "user");
  assert.equal(usersByKey.student.status, "active");
  assert.equal(usersByKey.inactive.status, "suspended");
  assert.equal(
    usersByKey["existing-platform-role"].platformRole,
    "moderator",
  );
  assert.equal(usersByKey["existing-platform-role"].status, "deleted");

  const secondRun = await applyPlatformRoleBackfill(collection);
  const after = await getPlatformRoleBackfillCounts(collection);

  assert.deepEqual(secondRun, {
    platformRole: 0,
    activeStatus: 0,
    suspendedStatus: 0,
  });
  assert.deepEqual(after, {
    platformRole: 0,
    activeStatus: 0,
    suspendedStatus: 0,
  });
});
