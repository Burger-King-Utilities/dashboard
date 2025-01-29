require("dotenv").config();
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const { Strategy } = require("passport-discord");

const app = express();

// Session Configuration
app.use(
  session({
    secret: "super-secret-key",
    resave: false,
    saveUninitialized: false,
  })
);

// Passport Configuration
passport.use(
  new Strategy(
    {
      clientID: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      callbackURL: process.env.DISCORD_REDIRECT_URI,
      scope: ["identify", "guilds", "guilds.members.read"],
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

app.use(passport.initialize());
app.use(passport.session());

// Required Guild and Role
const requiredGuildID = "1332703535980089425";
const requiredRoleID = "1332703655274483763";

// Routes
app.get("/login", passport.authenticate("discord"));
const axios = require("axios");

app.get(
  "/callback",
  passport.authenticate("discord", { failureRedirect: "/" }),
  async (req, res) => {
    try {
      const user = req.user;
      console.log("User Data:", user);

      if (!user || !user.guilds) {
        console.error("User data is undefined or missing guilds.");
        return res.status(500).send("Authentication failed. No user data.");
      }

      // Check if user is in the required guild
      const guild = user.guilds.find((g) => g.id === requiredGuildID);
      if (!guild) {
        console.error("User is not in the required guild.");
        return res.status(403).send("You must be in the required Discord server.");
      }

      // 🔴 Fetch member details from Discord API to get roles 🔴
      const response = await axios.get(
        `https://discord.com/api/v10/users/@me/guilds/${requiredGuildID}/member`,
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
        }
      );

      const memberData = response.data;
      console.log("Member Data:", memberData);

      if (!memberData.roles.includes(requiredRoleID)) {
        console.error("User does not have the required role.");
        return res.status(403).send("You don't have the required role!");
      }

      res.redirect("/dashboard");
    } catch (error) {
      console.error("Error during callback:", error.response?.data || error.message);
      res.status(500).send("Internal Server Error");
    }
  }
);


app.get("/check-role", (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.redirect("/");

    const guild = req.user.guilds.find((g) => g.id === requiredGuildID);
    if (!guild || !guild.roles.includes(requiredRoleID)) {
      return res.send("You don't have the required role!");
    }

    res.send("Welcome to the dashboard!");
  } catch (err) {
    console.error("Error during role check:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/", (req, res) => res.send("Home Page"));
app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) console.error(err);
    res.redirect("/");
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).send("Internal Server Error");
});

module.exports = app;
