const { port } = require("./config/config");
const server = require("./index");
const connectToDb = require("./utils/connectDb");

//connect to database
connectToDb();

server.listen(port, () => {
  console.log("ENV :", process.env.NODE_ENV);
  console.log(`listening on port: http://localhost:${port}`);
});
