class MongoTransactionReadinessError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "MongoTransactionReadinessError";
    this.code = code;
  }
}

const checkMongoTransactionReadiness = async (
  connection,
  { expectedReplicaSetName } = {},
) => {
  if (!connection?.db || typeof connection.startSession !== "function") {
    throw new MongoTransactionReadinessError(
      "MONGODB_CONNECTION_NOT_READY",
      "A connected Mongoose connection is required.",
    );
  }

  const hello = await connection.db.admin().command({ hello: 1 });

  if (!hello.setName) {
    throw new MongoTransactionReadinessError(
      "MONGODB_REPLICA_SET_REQUIRED",
      "MongoDB is running as a standalone server; transactions require a replica set or sharded cluster.",
    );
  }

  if (
    expectedReplicaSetName &&
    hello.setName !== expectedReplicaSetName
  ) {
    throw new MongoTransactionReadinessError(
      "MONGODB_REPLICA_SET_MISMATCH",
      `MongoDB replica set is "${hello.setName}", expected "${expectedReplicaSetName}".`,
    );
  }

  if (!hello.logicalSessionTimeoutMinutes) {
    throw new MongoTransactionReadinessError(
      "MONGODB_SESSIONS_UNAVAILABLE",
      "MongoDB logical sessions are unavailable.",
    );
  }

  const session = await connection.startSession();

  try {
    await session.withTransaction(
      async () => {
        await connection.db
          .collection("__transaction_readiness_one")
          .findOne({}, { session });
        await connection.db
          .collection("__transaction_readiness_two")
          .findOne({}, { session });
      },
      {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
        readPreference: "primary",
      },
    );
  } catch (error) {
    throw new MongoTransactionReadinessError(
      "MONGODB_TRANSACTION_CHECK_FAILED",
      `MongoDB transaction readiness check failed: ${error.message}`,
    );
  } finally {
    await session.endSession();
  }

  return {
    ready: true,
    topology: "replica_set",
    replicaSetName: hello.setName,
    isWritablePrimary: Boolean(hello.isWritablePrimary),
    logicalSessionTimeoutMinutes: hello.logicalSessionTimeoutMinutes,
  };
};

module.exports = {
  checkMongoTransactionReadiness,
  MongoTransactionReadinessError,
};
