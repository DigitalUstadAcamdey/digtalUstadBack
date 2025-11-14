const { port } = require("./config/config");
const server = require("./index");
const connectToDb = require("./utils/connectDb");

//connect to database
connectToDb();


server.listen(port, '0.0.0.0', () => {
  console.log("ENV :", process.env.NODE_ENV);
  // add '0.0.0.0' to enable traefik to listen prot :5000
  console.log(`listening on port: http://localhost:${port}`);
});
