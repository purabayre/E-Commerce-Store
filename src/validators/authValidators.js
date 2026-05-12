const { body } = require("express-validator");

exports.registerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),

  body("email")
    .isEmail()
    .withMessage("Please enter a valid email")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 3 })
    .withMessage("Password must be at least 3 characters"),
];

exports.loginValidation = [
  body("email").isEmail().withMessage("Enter valid email"),

  body("password").notEmpty().withMessage("Password is required"),
];
