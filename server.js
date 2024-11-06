const { port } = require("./config/config");
const app = require("./index");
const connectToDb = require("./utils/connectDb");

//connect to database
connectToDb();

app.listen(port, () => {
  console.log(`listening on port: http://localhost:${port}`);
});
