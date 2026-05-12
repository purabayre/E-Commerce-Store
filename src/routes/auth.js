const express = require("express");

const router = express.Router();

const authController = require("../controllers/authController");

const {
  registerValidation,
  loginValidation,
} = require("../validators/authValidators");

router.get("/register", authController.getRegister);
router.post("/register", registerValidation, authController.postRegister);
router.get("/login", authController.getLogin);
router.post("/login", loginValidation, authController.postLogin);
router.post("/logout", authController.postLogout);

module.exports = router;
