const { Op } = require("sequelize");
const { Product } = require("../models");
const ITEMS_PER_PAGE = 6;
const cartService = require("../services/cartService");

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
