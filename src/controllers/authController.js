const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");

const { User, Cart } = require("../models");

exports.getRegister = (req, res) => {
  res.render("auth/register", {
    pageTitle: "Register",
    oldInput: {},
  });
};

exports.postRegister = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).render("auth/register", {
        pageTitle: "Register",
        errors: errors.array(),
        oldInput: req.body,
      });
    }

    const existingUser = await User.findOne({
      where: { email },
    });

    if (existingUser) {
      req.flash("error", "Email already exists");
      return res.redirect("/auth/register");
    }

    if (password !== confirmPassword) {
      req.flash("error", "Passwords do not match");
      return res.redirect("/auth/register");
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      passwordHash: hashedPassword,
    });

    await Cart.create({
      UserId: user.id,
    });
    req.flash("success", "Registration successful");
    res.redirect("/auth/login");
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
};
exports.getLogin = (req, res) => {
  res.render("auth/login", {
    pageTitle: "Login",
    oldInput: {},
  });
};
exports.postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).render("auth/login", {
        pageTitle: "Login",
        errors: errors.array(),
        oldInput: req.body,
      });
    }
    const user = await User.findOne({
      where: { email },
    });

    if (!user) {
      req.flash("error", "Invalid email or password");
      return res.redirect("/auth/login");
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      req.flash("error", "Invalid email or password");
      return res.redirect("/auth/login");
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    req.session.save((err) => {
      if (err) {
        console.log(err);
      }

      res.redirect("/shop");
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
};

exports.postLogout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    }
    res.redirect("/auth/login");
  });
};
