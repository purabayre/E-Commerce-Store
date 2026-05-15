const path = require("path");
const fs = require("fs");
const Product = require("../models/Product");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const User = require("../models/User");
const { validationResult } = require("express-validator");
const { Op, fn, literal } = require("sequelize");

exports.getProducts = async (req, res, next) => {
  try {
    const adminId = req.session.user.id;

    // CURRENT MONTH RANGE
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );

    const endOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    const products = await Product.findAll({
      where: {
        isActive: true,
        UserId: adminId,
      },
    });

    // ORDERS for admin-owned products
    const orders = await Order.findAll({
      include: [
        User,
        {
          model: OrderItem,
          include: [
            {
              model: Product,
              where: {
                UserId: adminId,
              },
            },
          ],
          required: true,
        },
      ],
      order: [["createdAt", "DESC"]],
      distinct: true,
    });

    // TOTAL REVENUE THIS MONTH FROM ADMIN PRODUCTS
    const revenueResult = await OrderItem.findAll({
      attributes: [[fn("SUM", literal("quantity * price")), "revenue"]],
      include: [
        {
          model: Product,
          where: {
            UserId: adminId,
          },
          attributes: [],
        },
        {
          model: Order,
          attributes: [],
          where: {
            createdAt: {
              [Op.between]: [startOfMonth, endOfMonth],
            },
          },
        },
      ],
      raw: true,
    });

    const monthlyRevenue = revenueResult[0]
      ? Number(revenueResult[0].revenue || 0)
      : 0;

    // PENDING ORDERS COUNT for admin-owned products
    const pendingOrdersCount = await Order.count({
      where: {
        status: "pending",
      },
      include: [
        {
          model: OrderItem,
          include: [
            {
              model: Product,
              where: {
                UserId: adminId,
              },
              attributes: [],
            },
          ],
          required: true,
        },
      ],
      distinct: true,
    });

    // TOP 5 PRODUCTS BY REVENUE for admin-owned products
    const topProducts = await OrderItem.findAll({
      attributes: [
        "ProductId",
        [fn("SUM", literal("quantity * price")), "revenue"],
      ],

      include: [
        {
          model: Product,
          attributes: ["name"],
          where: {
            UserId: adminId,
          },
        },
      ],

      group: ["ProductId", "Product.id"],
      order: [[literal("revenue"), "DESC"]],
      limit: 5,
    });

    res.render("admin/products", {
      pageTitle: "Products",
      products,
      orders,
      monthlyRevenue,
      pendingOrdersCount,
      topProducts,
    });
  } catch (err) {
    next(err);
  }
};

exports.getAddProduct = (req, res) => {
  res.render("admin/add-product", {
    pageTitle: "Add Product",
    errors: [],
    oldInput: {},
  });
};

exports.postAddProduct = async (req, res) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).render("admin/add-product", {
        pageTitle: "Add Product",
        errors: errors.array(),
        oldInput: req.body,
      });
    }

    if (!req.file) {
      req.flash("error", "Product image required");

      return res.redirect("/admin/products/add");
    }

    const { name, description, price, stock, category } = req.body;

    await Product.create({
      name,
      description,
      price,
      stock,
      category,
      imagePath: req.file.path,
      UserId: req.session.user.id,
    });

    req.flash("success", "Product created");

    res.redirect("/admin/products");
  } catch (err) {
    console.log(err);

    res.status(500).send("Server Error");
  }
};

exports.getEditProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findByPk(productId);

    if (!product || product.UserId !== req.session.user.id) {
      return res.status(404).send("Product not found");
    }

    res.render("admin/edit-product", {
      pageTitle: "Edit Product",
      product,
      errors: [],
    });
  } catch (err) {
    console.log(err);

    res.status(500).send("Server Error");
  }
};

exports.postEditProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findByPk(productId);

    if (!product || product.UserId !== req.session.user.id) {
      return res.status(404).send("Product not found");
    }

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).render("admin/edit-product", {
        pageTitle: "Edit Product",
        product,
        errors: errors.array(),
      });
    }

    const { name, description, price, stock, category } = req.body;

    product.name = name;
    product.description = description;
    product.price = price;
    product.stock = stock;
    product.category = category;

    if (req.file) {
      if (product.imagePath) {
        fs.unlink(product.imagePath, (err) => {
          if (err) {
            console.log(err);
          }
        });
      }

      product.imagePath = req.file.path;
    }

    await product.save();

    req.flash("success", "Product updated");

    res.redirect("/admin/products");
  } catch (err) {
    console.log(err);

    res.status(500).send("Server Error");
  }
};

exports.postDeleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findByPk(productId);

    if (!product || product.UserId !== req.session.user.id) {
      return res.status(404).send("Product not found");
    }

    product.isActive = false;

    await product.save();

    req.flash("success", "Product deleted");

    res.redirect("/admin/products");
  } catch (err) {
    console.log(err);

    res.status(500).send("Server Error");
  }
};

exports.getProductImage = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product || !product.imagePath) {
      return res.status(404).send("Image not found");
    }

    const absolutePath = path.join(process.cwd(), product.imagePath);

    res.sendFile(absolutePath);
  } catch (err) {
    console.log(err);

    res.status(500).send("Server Error");
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const adminId = req.session.user.id;
    const orderId = req.params.orderId;

    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: OrderItem,
          required: true,
          include: [
            {
              model: Product,
              required: true,
              where: {
                UserId: adminId,
              },
            },
          ],
        },
      ],
    });

    if (!order) {
      req.flash("error", "Order not found or not owned by you");
      return res.redirect("/admin/products");
    }

    // 🔥 FIX: ensure status exists
    if (!order.status) {
      order.status = "pending";
    }

    let nextStatus = null;

    switch (order.status) {
      case "pending":
        nextStatus = "processing";
        order.processingAt = new Date();
        break;

      case "processing":
        nextStatus = "shipped";
        order.shippedAt = new Date();
        break;

      case "shipped":
        nextStatus = "delivered";
        order.deliveredAt = new Date();
        break;

      case "delivered":
        req.flash("success", "Order already delivered");
        return res.redirect("/admin/products");

      default:
        return res.redirect("/admin/products");
    }

    order.status = nextStatus;

    await order.save();

    req.flash("success", `Order marked as ${nextStatus}`);

    res.redirect("/admin/products");
  } catch (err) {
    next(err);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.findAll({
      include: [User, OrderItem],
      order: [["createdAt", "DESC"]],
    });

    res.render("admin/orders", {
      pageTitle: "Manage Orders",
      orders,
    });
  } catch (err) {
    next(err);
  }
};
