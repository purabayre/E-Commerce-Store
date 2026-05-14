const express = require("express");

const router = express.Router();

const shopController = require("../controllers/shopController");
const requireAuth = require("../middleware/requireAuth");

router.get("/", shopController.getShop);

router.get("/products/:id", shopController.getProductDetail);

router.get("/cart", shopController.getCart);

router.post("/cart", shopController.postCart);

router.post("/cart/update", shopController.postUpdateCart);

router.post("/cart/delete", shopController.postRemoveCartItem);

router.get("/checkout", shopController.getCheckout);

router.get("/checkout/success", shopController.getCheckoutSuccess);

router.get("/checkout/cancel", shopController.getCheckoutCancel);

router.get("/orders", shopController.getOrders);

router.get("/orders/:id/invoice", shopController.getInvoice);

router.post("/reviews/:productId", shopController.addReview);

router.post(
  "/reviews/update/:reviewId",

  shopController.updateReview,
);

router.post(
  "/reviews/delete/:reviewId",

  shopController.deleteReview,
);

module.exports = router;
