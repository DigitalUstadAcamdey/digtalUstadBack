require("dotenv").config();

module.exports = {
  port: process.env.PORT,
  uri: process.env.URI,
  jwt_secret: process.env.JWT_SECRET,
  jwt_expiration_time: process.env.JWT_EXPIRATION_TIME,
  chargily_public_key:process.env.CHARGILY_PUBLIC_KEY,
  chargily_secret_key:process.env.CHARGILY_SECRET_KEY,
  chargily_base_url:process.env.CHARGILY_BASE_URL,
  chargily_success_url:process.env.CHARGILY_SUCCESS_URL,
  chargily_failure_url:process.env.CHARGILY_FAILURE_URL
};
