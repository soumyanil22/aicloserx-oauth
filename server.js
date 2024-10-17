const express = require("express");
const passport = require("passport");
const session = require("express-session");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const User = require("./models/UserModel");
const db = require("./configs/db");
const cors = require('cors');
require("dotenv").config();

const app = express();

const corsOptions = {
  origin: ['https://aicloserx.com', 'https://www.aicloserx.com'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Configure session middleware
app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 30, // 30 minutes in milliseconds
      sameSite: 'lax',
      secure: true,
    },
  })
);

// Initialize 1
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport with Google OAuth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "https://aicloserx-oauth.onrender.com/auth/google/callback",
    },
    async function (accessToken, refreshToken, profile, done) {
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        user = new User({
          googleId: profile.id,
          email: profile.emails[0].value,
          displayName: profile.displayName,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          image: profile.photos[0].value,
        });
        await user.save();
      }
      return done(null, profile);
    }
  )
);

passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email });
        if (!user) {
          return done(null, false, { message: "Incorrect email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect email or password" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// Serialize and deserialize user to manage sessions
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Home route
app.get("/", (req, res) => {
  res.send('<h1>Home</h1><a href="/auth/google">Login with Google</a>');
});

// Google OAuth route
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth callback route
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "https://www.aicloserx.com/",
  }),
  (req, res) => {
    // Successful authentication
    res.redirect("https://aicloserx.com/chatbot.html");
  }
);

// Profile route - Protected route
app.get("/profile", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  res.status(200).json(req.user);
});

app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();

    req.login(newUser, (err) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Error logging in after registration" });
      }
      return res
        .status(201)
        .json({ message: "User registered and logged in successfully" });
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "https://aicloserx.com/chatbot.html",
    failureRedirect: "https://www.aicloserx.com/signup",
    failureFlash: true,
  })
);

// Logout route
app.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async (req, res) => {
  try {
    await db;
    console.log("Connected to DB");
    console.log(`Server is running on http://localhost:${PORT}`);
  } catch (error) {
    console.log(error);
  }
});
