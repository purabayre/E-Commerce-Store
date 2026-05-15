const { Op } = require("sequelize");
const { Product, Review, User } = require("../models");

const ITEMS_PER_PAGE = 6;

const cartService = require("../services/cartService");

const stripe = require("../config/stripe");

const Cart = require("../models/Cart");
const CartItem = require("../models/CartItem");

const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");

const emailService = require("../services/emailService");
const pdfService = require("../services/pdfService");
const sequelize = require("../config/db");

exports.getShop = async (req, res) => {
  try {
    const page = +req.query.page || 1;

    const category = req.query.category || "";

    const search = req.query.search || "";

    const whereClause = {
      isActive: true,
    };

    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause[Op.or] = [
        {
          name: {
            [Op.like]: `%${search}%`,
          },
        },

        {
          description: {
            [Op.like]: `%${search}%`,
          },
        },

        {
          category: {
            [Op.like]: `%${search}%`,
          },
        },
      ];
    }

    const totalProducts = await Product.count({
      where: whereClause,
    });

    const products = await Product.findAll({
      where: whereClause,

      limit: ITEMS_PER_PAGE,

      offset: (page - 1) * ITEMS_PER_PAGE,

      order: [
        ["stock", "DESC"],
        ["createdAt", "DESC"],
      ],
    });

    const categories = await Product.findAll({
      attributes: ["category"],
      group: ["category"],
    });

    res.render("shop/index", {
      pageTitle: "Shop",
      products,
      categories,
      currentPage: page,
      hasNextPage: ITEMS_PER_PAGE * page < totalProducts,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: Math.ceil(totalProducts / ITEMS_PER_PAGE),
      selectedCategory: category,
      searchTerm: search,
    });
  } catch (err) {
    console.log(err);

    res.status(500).send("Server Error");
  }
};

exports.getProductDetail = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findOne({
      where: {
        id: productId,
        isActive: true,
      },

      include: [
        {
          model: Review,

          include: [
            {
              model: User,
              attributes: ["id", "name"],
            },
          ],

          order: [["createdAt", "DESC"]],
        },
      ],
    });

    if (!product) {
      return res.status(404).send("Product not found");
    }

    const reviewCount = product.Reviews.length;

    const averageRating =
      reviewCount > 0
        ? (
            product.Reviews.reduce((sum, review) => sum + review.rating, 0) /
            reviewCount
          ).toFixed(1)
        : 0;

    product.dataValues.reviewCount = reviewCount;

    product.dataValues.averageRating = averageRating;

    res.render("shop/product-detail", {
      pageTitle: product.name,
      product,
      currentUser: req.session.user,
    });
  } catch (err) {
    console.log(err);

    res.status(500).send("Server Error");
  }
};

exports.postCart = async (req, res) => {
  try {
    const productId = req.body.productId;

    const quantity = parseInt(req.body.quantity) || 1;

    if (req.session.user) {
      await cartService.addToUserCart(req.session.user.id, productId, quantity);
    } else {
      await cartService.addToGuestCart(req.session, productId, quantity);
    }

    req.flash("success", "Added to cart");

    res.redirect("/shop/cart");
  } catch (err) {
    console.log(err);

    req.flash("error", err.message);

    res.redirect("/shop");
  }
};

exports.getCart = async (req, res) => {
  try {
    let cartData;

    if (req.session.user) {
      cartData = await cartService.getUserCart(req.session.user.id);
    } else {
      cartData = await cartService.getGuestCart(req.session);
    }

    res.render("shop/cart", {
      pageTitle: "Your Cart",
      cart: cartData,
    });
  } catch (err) {
    console.log(err);

    res.status(500).send("Server Error");
  }
};

exports.postUpdateCart = async (req, res) => {
  try {
    const quantity = parseInt(req.body.quantity);

    if (quantity <= 0) {
      return res.redirect("/shop/cart");
    }

    if (req.session.user) {
      await cartService.updateUserCartItem(req.body.cartItemId, quantity);
    } else {
      cartService.updateGuestCartItem(
        req.session,
        req.body.productId,
        quantity,
      );
    }

    req.flash("success", "Cart updated");

    res.redirect("/shop/cart");
  } catch (err) {
    console.log(err);

    req.flash("error", err.message);

    res.redirect("/shop/cart");
  }
};

exports.postRemoveCartItem = async (req, res) => {
  try {
    if (req.session.user) {
      await cartService.removeUserCartItem(req.body.cartItemId);
    } else {
      cartService.removeGuestCartItem(req.session, req.body.productId);
    }

    req.flash("success", "Item removed");

    res.redirect("/shop/cart");
  } catch (err) {
    console.log(err);

    res.status(500).send("Server Error");
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.findAll({
      where: {
        UserId: req.session.user.id,
      },

      include: [
        {
          model: OrderItem,
          include: [Product],
        },
      ],

      order: [["createdAt", "DESC"]],
    });

    res.render("shop/orders", {
      pageTitle: "Orders",
      orders,
    });
  } catch (err) {
    next(err);
  }
};

exports.getCheckout = async (req, res, next) => {
  try {
    const userId = req.session.user.id;

    const cart = await Cart.findOne({
      where: {
        UserId: userId,
      },

      include: [
        {
          model: CartItem,
          include: [Product],
        },
      ],
    });

    if (!cart || cart.CartItems.length === 0) {
      req.flash("error", "Cart is empty");

      return res.redirect("/shop/cart");
    }

    // Check if all products are active
    for (const item of cart.CartItems) {
      if (!item.Product.isActive) {
        req.flash(
          "error",
          `Product "${item.Product.name}" is no longer available`,
        );
        return res.redirect("/shop/cart");
      }
    }

    const lineItems = cart.CartItems.map((item) => {
      return {
        price_data: {
          currency: "usd",

          product_data: {
            name: item.Product.name,
          },

          unit_amount: Math.round(item.Product.price * 100),
        },

        quantity: item.quantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],

      line_items: lineItems,

      mode: "payment",

      success_url: `http://localhost:${process.env.PORT}/shop/checkout/success?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `http://localhost:${process.env.PORT}/shop/checkout/cancel`,
    });

    res.redirect(session.url);
  } catch (err) {
    next(err);
  }
};

exports.getCheckoutSuccess = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const sessionId = req.query.session_id;

    if (!sessionId) {
      return res.redirect("/shop/cart");
    }

    const existingOrder = await Order.findOne({
      where: {
        stripeSessionId: sessionId,
      },
      transaction,
    });

    if (existingOrder) {
      await transaction.commit();
      return res.redirect("/shop/orders");
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      await transaction.rollback();
      req.flash("error", "Payment not completed");

      return res.redirect("/shop/cart");
    }

    const userId = req.session.user.id;

    const cart = await Cart.findOne({
      where: {
        UserId: userId,
      },

      include: [
        {
          model: CartItem,
          include: [Product],
        },
      ],
      transaction,
    });

    if (!cart || cart.CartItems.length === 0) {
      await transaction.rollback();
      return res.redirect("/shop/cart");
    }

    let total = 0;

    cart.CartItems.forEach((item) => {
      total += item.Product.price * item.quantity;
    });

    const order = await Order.create(
      {
        UserId: userId,
        totalAmount: total,
        status: "pending",
        stripeSessionId: sessionId,
      },
      { transaction },
    );

    for (const item of cart.CartItems) {
      const product = item.Product;

      if (!product.isActive) {
        await transaction.rollback();
        throw new Error(`Product "${product.name}" is no longer available`);
      }

      if (product.stock < item.quantity) {
        await transaction.rollback();
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      await OrderItem.create(
        {
          OrderId: order.id,
          ProductId: product.id,
          quantity: item.quantity,
          priceAtPurchase: product.price,
        },
        { transaction },
      );

      product.stock -= item.quantity;

      await product.save({ transaction });
    }

    await CartItem.destroy({
      where: {
        CartId: cart.id,
      },
      transaction,
    });

    await transaction.commit();

    try {
      const emailStatus = await emailService.sendEmail(
        req.session.user.email,
        "You checkOut successfully",
        `
          <h1>Thank You!</h1>

          <p>Your order #${order.id} has been placed successfully.</p>
        `,
      );

      console.log("checkout success email sent:", emailStatus.success);
    } catch (emailErr) {
      console.error("Failed to send order confirmation email:", emailErr);
    }

    req.flash("success", "Order placed successfully");

    res.redirect("/shop/orders");
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
};

exports.getCheckoutCancel = (req, res) => {
  req.flash("error", "Payment cancelled");

  res.redirect("/shop/cart");
};

exports.getInvoice = async (req, res, next) => {
  try {
    const orderId = req.params.id;

    const userId = req.session.user.id;

    const order = await Order.findOne({
      where: {
        id: orderId,
        UserId: userId,
      },

      include: [
        {
          model: OrderItem,
          include: [Product],
        },
      ],
    });

    if (!order) {
      return res.status(404).render("404", {
        pageTitle: "Order Not Found",
      });
    }

    pdfService.generateInvoice(order, res);
  } catch (err) {
    next(err);
  }
};

exports.addReview = async (req, res, next) => {
  try {
    const productId = req.params.productId;

    const { rating, comment } = req.body;

    const userId = req.session.user.id;

    const product = await Product.findByPk(productId);

    if (!product) {
      req.flash("error", "Product not found");

      return res.redirect("/shop");
    }

    const existingReview = await Review.findOne({
      where: {
        userId,
        productId,
      },
    });

    if (existingReview) {
      req.flash("error", "You already reviewed this product");

      return res.redirect(`/shop/products/${productId}`);
    }

    await Review.create({
      rating,
      comment,
      userId,
      productId,
    });

    req.flash("success", "Review added successfully");

    res.redirect(`/shop/products/${productId}`);
  } catch (err) {
    console.log(err);

    req.flash("error", "Failed to add review");

    res.redirect("back");
  }
};
exports.updateReview = async (req, res, next) => {
  try {
    const reviewId = req.params.reviewId;

    const { rating, comment } = req.body;

    const userId = req.session.user.id;

    const review = await Review.findByPk(reviewId);

    if (!review) {
      req.flash("error", "Review not found");

      return res.redirect("/shop");
    }

    // CHECK REVIEW OWNER

    if (review.userId !== userId) {
      req.flash("error", "Unauthorized action");

      return res.redirect(`/shop/products/${review.productId}`);
    }

    // UPDATE REVIEW

    review.rating = rating;
    review.comment = comment;

    await review.save();

    req.flash("success", "Review updated successfully");

    res.redirect(`/shop/product/${review.productId}`);
  } catch (err) {
    console.log(err);

    req.flash("error", "Failed to update review");

    res.redirect("back");
  }
};

exports.deleteReview = async (req, res, next) => {
  try {
    const reviewId = req.params.reviewId;

    const userId = req.session.user.id;

    const review = await Review.findByPk(reviewId);

    if (!review) {
      req.flash("error", "Review not found");

      return res.redirect("/shop");
    }

    if (review.userId !== userId) {
      req.flash("error", "Unauthorized action");
      return res.redirect(`/shop/product/${review.productId}`);
    }
    const productId = review.productId;
    await review.destroy();
    req.flash("success", "Review deleted successfully");
    res.redirect(`/shop/products/${productId}`);
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to delete review");
    res.redirect("/shop");
  }
};
