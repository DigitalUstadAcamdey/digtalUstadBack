const { createClient } = require("redis");
const client = createClient();
const coonectToRedis = async () => {
  client.on("error", (err) => {
    console.log("Redis Client Error", err);
    process.exit(1);
  });

  await client.connect();
};
module.exports = coonectToRedis;
