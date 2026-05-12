const express = require("express");

const router = express.Router();

const shopController = require("../controllers/shopController");

router.get("/", shopController.getShop);

router.get("/products/:id", shopController.getProductDetail);

router.get("/cart", shopController.getCart);

router.post("/cart", shopController.postCart);

router.post("/cart/update", shopController.postUpdateCart);

router.post("/cart/remove", shopController.postRemoveCartItem);

module.exports = router;
