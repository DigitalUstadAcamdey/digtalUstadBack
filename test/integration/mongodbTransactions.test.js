const assert = require("node:assert/strict");
const test = require("node:test");
const mongoose = require("mongoose");
require("dotenv").config();

const {
  checkMongoTransactionReadiness,
} = require("../../src/utils/mongoTransactionReadiness");

test("configured MongoDB supports sequential multi-collection transactions", async (t) => {
  const uri = process.env.MONGODB_TRANSACTION_TEST_URI;

  if (!uri) {
    if (process.env.REQUIRE_TRANSACTION_TEST_URI === "true") {
      assert.fail(
        "MONGODB_TRANSACTION_TEST_URI is required for the transaction integration test.",
      );
    }

    t.skip("MONGODB_TRANSACTION_TEST_URI is not configured.");
    return;
  }

  const connection = await mongoose
    .createConnection(uri, {
      serverSelectionTimeoutMS: 10000,
    })
    .asPromise();

  t.after(async () => {
    await connection.close();
  });

  const result = await checkMongoTransactionReadiness(connection, {
    expectedReplicaSetName:
      process.env.MONGO_REPLICA_SET_NAME || undefined,
  });

  assert.equal(result.ready, true);
  assert.equal(result.topology, "replica_set");
  assert.equal(typeof result.replicaSetName, "string");
  assert.ok(result.replicaSetName.length > 0);
  assert.ok(result.logicalSessionTimeoutMinutes > 0);
});
