const mongoose = require("mongoose");
const User = require("../models/userModel");
const { uri } = require("../config/config");
const {
  DEFAULT_PLATFORM_ROLE,
  DEFAULT_USER_STATUS,
} = require("../utils/platformRoles");

const missingField = (field) => ({
  $or: [
    { [field]: { $exists: false } },
    { [field]: null },
  ],
});

const platformRoleFilter = missingField("platformRole");
const statusFilter = missingField("status");
const suspendedStatusFilter = {
  $and: [
    statusFilter,
    { active: false },
  ],
};
const activeStatusFilter = {
  $and: [
    statusFilter,
    { active: { $ne: false } },
  ],
};

const getPlatformRoleBackfillCounts = async (collection) => ({
  platformRole: await collection.countDocuments(platformRoleFilter),
  activeStatus: await collection.countDocuments(activeStatusFilter),
  suspendedStatus: await collection.countDocuments(suspendedStatusFilter),
});

const applyPlatformRoleBackfill = async (collection) => {
  const platformRoleResult = await collection.updateMany(
    platformRoleFilter,
    {
      $set: {
        platformRole: DEFAULT_PLATFORM_ROLE,
      },
    },
  );

  const suspendedStatusResult = await collection.updateMany(
    suspendedStatusFilter,
    {
      $set: {
        status: "suspended",
      },
    },
  );

  const activeStatusResult = await collection.updateMany(
    activeStatusFilter,
    {
      $set: {
        status: DEFAULT_USER_STATUS,
      },
    },
  );

  return {
    platformRole: platformRoleResult.modifiedCount,
    activeStatus: activeStatusResult.modifiedCount,
    suspendedStatus: suspendedStatusResult.modifiedCount,
  };
};

const run = async () => {
  const apply = process.argv.includes("--apply");

  if (!uri) {
    throw new Error("URI is required to backfill platform roles.");
  }

  await mongoose.connect(uri);

  try {
    const before = await getPlatformRoleBackfillCounts(User.collection);

    console.log("Platform role backfill candidates:");
    console.log(JSON.stringify(before, null, 2));

    if (!apply) {
      console.log(
        "Dry run only. Re-run with --apply to persist the backfill.",
      );
      return;
    }

    const modified = await applyPlatformRoleBackfill(User.collection);
    await User.createIndexes();

    console.log("Platform role backfill modified:");
    console.log(JSON.stringify(modified, null, 2));
  } finally {
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  run().catch((error) => {
    console.error("Platform role backfill failed.");
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  getPlatformRoleBackfillCounts,
  applyPlatformRoleBackfill,
};
