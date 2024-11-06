const User = require("../models/userModel");

const GoogleStrategy = require("passport-google-oauth20").Strategy;

module.exports = (passport) => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.URL}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await User.findOneAndUpdate(
            { googleId: profile.id },
            {
              googleId: profile.id,
              username: profile.displayName,
              thumbnail: profile.photos[0]?.value,
              email: profile.emails[0]?.value,
              token: accessToken,//correct ???
            },
            { upsert: true, new: true }
          );
          done(null, user);
        } catch (err) {
          done(err, null);
        }
      }
    )
  );
};
