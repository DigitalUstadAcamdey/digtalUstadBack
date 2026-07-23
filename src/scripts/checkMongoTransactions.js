require("dotenv").config();

const mongoose = require("mongoose");
const {
  checkMongoTransactionReadiness,
} = require("../utils/mongoTransactionReadiness");

const run = async () => {
  const uri = process.env.URI;

  if (!uri) {
    throw new Error("URI is required to check MongoDB transaction readiness.");
  }

  const connection = await mongoose
    .createConnection(uri, {
      serverSelectionTimeoutMS: 10000,
    })
    .asPromise();

  try {
    const result = await checkMongoTransactionReadiness(connection, {
      expectedReplicaSetName:
        process.env.MONGO_REPLICA_SET_NAME || undefined,
    });

    console.log("MongoDB transaction readiness: ready");
    console.log(`Topology: ${result.topology}`);
    console.log(`Replica set: ${result.replicaSetName}`);
    console.log(`Writable primary: ${result.isWritablePrimary}`);
  } finally {
    await connection.close();
  }
};

run().catch((error) => {
  console.error(
    `MongoDB transaction readiness: failed (${error.code || "UNKNOWN_ERROR"})`,
  );
  console.error(error.message);
  process.exitCode = 1;
});
