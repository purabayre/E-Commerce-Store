require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const SequelizeStore = require("connect-session-sequelize")(session.Store);
const flash = require("connect-flash");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const csrf = require("csurf");
const authRoutes = require("./routes/auth");
const shopRoutes = require("./routes/shop");
const adminRoutes = require("./routes/admin");
const webhookRoutes = require("./routes/webhook");

const sequelize = require("./config/db");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "./public")));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

const sessionStore = new SequelizeStore({
  db: sequelize,
});

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,

    cookie: {
      secure: false,
    },
  }),
);

app.use(flash());

app.use("/webhooks", webhookRoutes);

app.use((req, res, next) => {
  res.locals.isAuthenticated = !!req.session.user;
  res.locals.currentUser = req.session.user || null;
  res.locals.errorMessage = req.flash("error");
  res.locals.successMessage = req.flash("success");

  next();
});

app.use("/auth", authRoutes);
app.use("/shop", shopRoutes);
app.use("/admin", adminRoutes);

sequelize
  .sync()
  .then(() => {
    sessionStore.sync();

    app.listen(process.env.PORT, () => {
      console.log(`Server running on http://localhost:${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
