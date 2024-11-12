const { port } = require("./config/config");
const app = require("./index");
const connectToDb = require("./utils/connectDb");

console.log(process.env.NODE_ENV);

//connect to database
connectToDb();

app.listen(port, () => {
  console.log(`listening on port: http://localhost:${port}`);
});
