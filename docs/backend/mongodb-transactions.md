# MongoDB Transactions for Local Development

## Current topology

The production-oriented `docker-compose.yml` currently starts MongoDB as a
standalone server:

```text
mongod --bind_ip_all
```

It does not configure a replica set, so that declared topology does not support
the future atomic school-creation transaction.

Production may use a different `URI` and topology at deployment time. This
repository does not assume or alter that external topology. The existing
`docker-compose.yml` remains unchanged.

## Development topology

`docker-compose.dev.yml` provides a separate local-only MongoDB service:

- one MongoDB node;
- replica-set name `rs0` by default;
- an idempotent `rs.initiate()` helper service;
- a dedicated named volume, `mongo_dev_replica_data`;
- port 27017 bound only to `127.0.0.1`; and
- no development credentials.

This setup is for local development and integration tests only. A single-node
replica set enables transactions but does not provide production high
availability.

The separate named volume ensures these commands do not reset, delete, or
silently convert the volume used by the existing Compose configuration.

## Initialize locally

Start MongoDB and the one-time replica-set initializer:

```bash
docker compose -f docker-compose.dev.yml up -d mongo-dev mongo-replica-init
```

Inspect readiness:

```bash
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml logs mongo-replica-init
```

The initializer is idempotent. Running the `up` command again preserves the
named volume and reports that the replica set is already initialized.

Do not add `-v`, run `down --volumes`, delete the named volume, or remove
existing database directories as part of initialization.

## Connection URI

When the Node application runs on the host:

```text
mongodb://127.0.0.1:27017/e-learning?replicaSet=rs0&directConnection=true
```

`directConnection=true` is appropriate here because Docker exposes only one
development replica-set endpoint to the host.

When an application container joins the `digital-ustad-dev` network:

```text
mongodb://mongo-dev:27017/e-learning?replicaSet=rs0
```

The active `.env` file is not changed automatically. Copy or set the applicable
URI manually. Production must continue to supply its own authenticated URI and
must not copy the unauthenticated development URI.

## Verify transaction readiness

The CLI check uses `URI`, runs a read-only transaction across two collection
names sequentially, and prints topology metadata:

```bash
npm run mongodb:transactions:check
```

It does not create, update, delete, or drop application records.

The integration test requires an explicit test URI:

```bash
MONGODB_TRANSACTION_TEST_URI="mongodb://127.0.0.1:27017/e-learning-transaction-readiness?replicaSet=rs0&directConnection=true" npm run test:transactions
```

The test also performs only sequential reads inside the transaction. Do not use
`Promise.all` or other parallel operations inside future Mongoose transaction
callbacks.

Expected successful result:

```text
MongoDB transaction readiness: ready
Topology: replica_set
Replica set: rs0
Writable primary: true
```

## Existing local data

This development configuration deliberately uses a new volume. It does not
automatically migrate data from `mongo-data/`, the production bind mount, or
another standalone MongoDB volume.

If existing local data must be reused:

1. make and verify a backup;
2. identify the exact existing volume or bind mount;
3. stop application writes;
4. update that MongoDB process to start with `--replSet <name>`;
5. start MongoDB without deleting or recreating its data directory;
6. run `rs.status()` first;
7. run `rs.initiate()` only when MongoDB reports that no replica-set
   configuration has been received;
8. wait for a writable primary; and
9. run the readiness check.

Those are manual operational actions. They are not executed by repository
scripts because the correct production/local data target cannot be inferred
safely.

## Production compatibility

Before using multi-document transactions in production, operations must verify:

- the actual production `URI`;
- whether the deployment is a replica set or sharded cluster;
- the replica-set name and member hostnames;
- that a writable primary and logical sessions are available;
- backup and restore procedures; and
- transaction behavior in staging.

Do not force the development replica-set name or `directConnection=true` onto a
production multi-node topology. Production member discovery and authentication
must follow the production database provider's configuration.

MongoDB documents that multi-document transactions require a replica set or
sharded cluster and recommends `directConnection=true` only for development or
test Docker replica sets where one endpoint is exposed:

- https://www.mongodb.com/docs/manual/core/transactions-production-consideration/
- https://www.mongodb.com/docs/drivers/node/current/connect/connection-targets/
