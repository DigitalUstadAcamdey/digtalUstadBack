const { port } = require("./config/config");
const server = require("./index");
const connectToDb = require("./utils/connectDb");
const moment = require("moment");

console.log(process.env.NODE_ENV);

//connect to database
connectToDb();

server.listen(port, () => {
  console.log(moment().add(10 ,'minute').toDate());
  console.log(`listening on port: http://localhost:${port}`);
});
