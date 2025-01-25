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

const requiredGuildID = "1332703535980089425";
const requiredRoleID = "1332703655274483763";

// Routes
app.get("/login", passport.authenticate("discord"));
app.get(
  "/callback",
  passport.authenticate("discord", { failureRedirect: "/" }),
  (req, res) => {
    // After successful authentication, you can get the user roles
    const user = req.user;

    // Check if the user is a member of the required guild
    const guild = user.guilds.find((g) => g.id === requiredGuildID);
    if (!guild || !guild.roles.includes(requiredRoleID)) {
      return res.send("You don't have the required role!");
    }

    // If the user has the required role, redirect to the dashboard
    res.redirect("/dashboard");
  }
);

app.get("/check-role", (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/");

  const guild = req.user.guilds.find((g) => g.id === requiredGuildID);
  if (!guild || !guild.roles.includes(requiredRoleID)) {
    return res.send("You don't have the required role!");
  }

  res.send("Welcome to the dashboard!");
});

app.get("/", (req, res) => res.send("Home Page"));
app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) console.error(err);
    res.redirect("/");
  });
});

module.exports = app;
