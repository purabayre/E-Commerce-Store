const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const crypto = require("crypto");
const emailService = require("../services/emailService");
const { Op } = require("sequelize");

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

exports.getForgotPassword = (req, res) => {
  res.render("auth/forgetPassword", {
    pageTitle: "Forgot Password",
  });
};

exports.postForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({
      where: { email },
    });

    if (!user) {
      req.flash("success", "If that email exists, a reset link has been sent.");

      return res.redirect("/auth/forgot-password");
    }

    const token = crypto.randomBytes(32).toString("hex");

    user.resetToken = token;

    user.resetTokenExpiration = Date.now() + 3600000; // 1 hour

    await user.save();

    const resetLink = `http://localhost:3000/auth/reset/${token}`;

    const emailStatus = await emailService.sendEmail(
      user.email,
      "Password Reset",
      `
        <h2>Password Reset</h2>
        <p>Click below to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link expires in 1 hour.</p>
      `,
    );
    console.log("reset password link sent:", emailStatus.success);

    req.flash("success", "If that email exists, a reset link has been sent.");

    res.redirect("/auth/login");
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
};

exports.getResetPassword = async (req, res) => {
  try {
    const token = req.params.token;

    const user = await User.findOne({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          [Op.gt]: Date.now(),
        },
      },
    });

    if (!user) {
      req.flash("error", "Invalid or expired reset token");
      return res.redirect("/auth/login");
    }

    res.render("auth/resetPassword", {
      pageTitle: "Reset Password",
      token,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
};
exports.postResetPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;

    const token = req.params.token;

    if (password !== confirmPassword) {
      req.flash("error", "Passwords do not match");

      return res.redirect(`/auth/reset/${token}`);
    }

    const user = await User.findOne({
      where: {
        resetToken: token,
        resetTokenExpiration: {
          [Op.gt]: Date.now(),
        },
      },
    });

    if (!user) {
      req.flash("error", "Invalid or expired token");

      return res.redirect("/auth/login");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    user.passwordHash = hashedPassword;

    // invalidate token
    user.resetToken = null;
    user.resetTokenExpiration = null;

    await user.save();

    req.flash("success", "Password reset successful");

    res.redirect("/auth/login");
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
};
