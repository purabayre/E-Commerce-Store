const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const requireAdmin = require("../middleware/requireAdmin");
const upload = require("../middleware/upload");
const { productValidation } = require("../validators/productValidators");

router.get("/products", requireAdmin, adminController.getProducts);

router.get("/products/add", requireAdmin, adminController.getAddProduct);

router.post(
  "/products",
  requireAdmin,
  upload.single("image"),
  productValidation,
  adminController.postAddProduct,
);

router.get("/products/:id/edit", requireAdmin, adminController.getEditProduct);

router.post(
  "/products/:id",
  requireAdmin,
  upload.single("image"),
  productValidation,
  adminController.postEditProduct,
);

router.post(
  "/products/:id/delete",
  requireAdmin,
  adminController.postDeleteProduct,
);

router.get("/products/:id/image", adminController.getProductImage);
router.post(
  "/orders/:orderId/status",
  requireAdmin,
  adminController.updateOrderStatus,
);

module.exports = router;
