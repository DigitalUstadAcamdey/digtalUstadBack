#!/bin/sh

set -eu

replica_set_name="${MONGO_REPLICA_SET_NAME:-rs0}"
replica_set_host="${MONGO_REPLICA_SET_HOST:-mongo-dev:27017}"

case "${replica_set_name}" in
  ""|*[!A-Za-z0-9_-]*)
    echo "MONGO_REPLICA_SET_NAME contains unsupported characters." >&2
    exit 1
    ;;
esac

case "${replica_set_host}" in
  ""|*[!A-Za-z0-9.:-]*)
    echo "MONGO_REPLICA_SET_HOST contains unsupported characters." >&2
    exit 1
    ;;
esac

mongosh --quiet --host "${replica_set_host}" --eval "
  const desiredName = '${replica_set_name}';
  const desiredHost = '${replica_set_host}';

  try {
    const status = rs.status();

    if (status.set !== desiredName) {
      throw new Error(
        'MongoDB is already initialized with replica set ' + status.set +
        ', expected ' + desiredName + '.'
      );
    }

    print('Replica set ' + desiredName + ' is already initialized.');
    quit(0);
  } catch (error) {
    const notInitialized =
      error.code === 94 ||
      error.codeName === 'NotYetInitialized' ||
      String(error.message || error).includes('no replset config has been received');

    if (!notInitialized) {
      throw error;
    }
  }

  rs.initiate({
    _id: desiredName,
    members: [
      {
        _id: 0,
        host: desiredHost
      }
    ]
  });
"

attempt=1
while [ "${attempt}" -le 30 ]; do
  if mongosh --quiet --host "${replica_set_host}" --eval \
    "const hello = db.adminCommand({ hello: 1 }); quit(hello.isWritablePrimary ? 0 : 1);"
  then
    echo "Replica set ${replica_set_name} has a writable primary."
    exit 0
  fi

  attempt=$((attempt + 1))
  sleep 1
done

echo "Replica set ${replica_set_name} did not become writable in time." >&2
exit 1
