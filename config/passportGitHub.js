const passport = require("passport");
const User = require("../models/userModel");
const GitHubStrategy = require("passport-github2").Strategy;

module.exports = (passport) => {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `http://localhost:5000/api/auth/github/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log("first")
          let user = await User.findOne({ githubId: profile.id });
          if (user) return done(null, user);

          // إنشاء مستخدم جديد في حال لم يكن موجودًا
          user = await User.create({
            githubId: profile.id,
            username: profile.username,
            thumbnail: profile._json.avatar_url,
          });
          console.log("from passport", user);
          return done(null, user);
        } catch (error) {
          console.error("Error in GitHub strategy:", error);
          return done(error, null);
        }
      }
    )
  );
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
  });
};
