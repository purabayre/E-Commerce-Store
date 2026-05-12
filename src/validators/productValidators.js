const { body } = require("express-validator");

exports.productValidation = [
  body("name").trim().notEmpty().withMessage("Product name required"),

  body("description")
    .trim()
    .isLength({ min: 10 })
    .withMessage("Description too short"),

  body("price").isFloat({ min: 1 }).withMessage("Price must be valid"),

  body("stock").isInt({ min: 0 }).withMessage("Stock must be 0 or more"),

  body("category").trim().notEmpty().withMessage("Category required"),
];
