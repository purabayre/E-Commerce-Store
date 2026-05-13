const express = require("express");

const router = express.Router();

const shopController = require("../controllers/shopController");
const requireAuth = require("../middleware/requireAuth");

router.get("/", shopController.getShop);

router.get("/products/:id", shopController.getProductDetail);

router.get("/cart", shopController.getCart);

router.post("/cart", shopController.postCart);

router.post("/cart/update", shopController.postUpdateCart);

router.post("/cart/remove", shopController.postRemoveCartItem);

router.get("/checkout", requireAuth, shopController.getCheckout);

router.get("/checkout/success", requireAuth, shopController.getCheckoutSuccess);

router.get("/checkout/cancel", requireAuth, shopController.getCheckoutCancel);

router.get("/orders", requireAuth, shopController.getOrders);

module.exports = router;
