const express = require("express");

const router = express.Router();

const shopController = require("../controllers/shopController");
const requireAuth = require("../middleware/requireAuth");

router.get("/", shopController.getShop);

router.get("/product/:id", shopController.getProductDetail);

router.get("/cart", shopController.getCart);

router.post("/cart", shopController.postCart);

router.post("/cart/update", shopController.postUpdateCart);

router.post("/cart/delete", shopController.postRemoveCartItem);

router.get("/checkout", requireAuth, shopController.getCheckout);

router.get("/checkout/success", requireAuth, shopController.getCheckoutSuccess);

router.get("/checkout/cancel", requireAuth, shopController.getCheckoutCancel);

router.get("/orders", requireAuth, shopController.getOrders);

router.get("/orders/:id/invoice", requireAuth, shopController.getInvoice);

router.post("/reviews/:productId", requireAuth, shopController.addReview);

router.post(
  "/reviews/update/:reviewId",
  requireAuth,
  shopController.updateReview,
);

router.post(
  "/reviews/delete/:reviewId",
  requireAuth,
  shopController.deleteReview,
);

module.exports = router;
