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
router.get("/forgot-password", authController.getForgotPassword);
router.post("/forgot-password", authController.postForgotPassword);
router.get("/reset/:token", authController.getResetPassword);
router.post("/reset/:token", authController.postResetPassword);

module.exports = router;
