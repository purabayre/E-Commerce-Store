const { Op } = require("sequelize");
const { Product } = require("../models");
const ITEMS_PER_PAGE = 6;
const cartService = require("../services/cartService");
const stripe = require("../config/stripe");
const Cart = require("../models/Cart");
const CartItem = require("../models/CartItem");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const emailService = require("../services/emailService");
const pdfService = require("../services/pdfService");

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
    });
    if (!product) {
      return res.status(404).send("Product not found");
    }
    res.render("shop/product-detail", {
      pageTitle: product.name,
      product,
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
    console.log(req.session.user);

    if (req.session.user) {
      cartData = await cartService.getUserCart(req.session.user.id);
    } else {
      cartData = await cartService.getGuestCart(req.session);
    }
    console.log(cartData);
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
      where: { UserId: userId },

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
  try {
    const sessionId = req.query.session_id;

    if (!sessionId) {
      return res.redirect("/shop/cart");
    }

    // Prevent duplicate orders
    const existingOrder = await Order.findOne({
      where: {
        stripeSessionId: sessionId,
      },
    });

    if (existingOrder) {
      return res.redirect("/shop/orders");
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      req.flash("error", "Payment not completed");
      return res.redirect("/shop/cart");
    }

    const userId = req.session.user.id;

    const cart = await Cart.findOne({
      where: { UserId: userId },

      include: [
        {
          model: CartItem,
          include: [Product],
        },
      ],
    });

    if (!cart || cart.CartItems.length === 0) {
      return res.redirect("/shop/cart");
    }

    let total = 0;

    cart.CartItems.forEach((item) => {
      total += item.Product.price * item.quantity;
    });

    // Create order
    const order = await Order.create({
      UserId: userId,
      totalAmount: total,
      status: "processing",
      stripeSessionId: sessionId,
    });

    // Create order items + decrement stock
    for (const item of cart.CartItems) {
      const product = item.Product;

      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      await OrderItem.create({
        OrderId: order.id,
        ProductId: product.id,
        quantity: item.quantity,
        priceAtPurchase: product.price,
      });

      product.stock -= item.quantity;

      await product.save();
    }

    // Clear cart
    await CartItem.destroy({
      where: {
        CartId: cart.id,
      },
    });

    // Email confirmation

    const emailStatus = await emailService.sendEmail(
      req.session.user.email,
      "You checkOut successfully",
      `
      <h1>Thank You!</h1>

      <p>Your order #${order.id} has been placed successfully.</p>
    `,
    );
    console.log("checkout seccess email sent:", emailStatus.success);

    req.flash("success", "Order placed successfully");

    res.redirect("/shop/orders");
  } catch (err) {
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

    /*
     * FIND ORDER
     */
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

    /*
     * SECURITY CHECK
     */
    if (!order) {
      return res.status(404).render("404", {
        pageTitle: "Order Not Found",
      });
    }

    /*
     * STREAM PDF
     */
    pdfService.generateInvoice(order, res);
  } catch (err) {
    next(err);
  }
};
