const { Cart, CartItem, Product } = require("../models");

// Guest cart
exports.addToGuestCart = async (session, productId, quantity = 1) => {
  const product = await Product.findByPk(productId);
  if (!product || !product.isActive) {
    throw new Error("Product not found");
  }
  if (product.stock < quantity) {
    throw new Error("Not enough stock");
  }
  if (!session.cart) {
    session.cart = {
      items: [],
    };
  }
  const existingItem = session.cart.items.find(
    (item) => item.productId == productId,
  );
  if (existingItem) {
    const newQty = existingItem.quantity + quantity;
    if (newQty > product.stock) {
      throw new Error("Stock exceeded");
    }
    existingItem.quantity = newQty;
  } else {
    session.cart.items.push({
      productId: product.id,
      quantity,
      product: {
        name: product.name,
        price: product.price,
        imagePath: product.imagePath,
      },
    });
  }
};

// Logged-in user cart
exports.addToUserCart = async (userId, productId, quantity = 1) => {
  const product = await Product.findByPk(productId);

  if (!product || !product.isActive) {
    throw new Error("Product not found");
  }

  let cart = await Cart.findOne({
    where: {
      UserId: userId,
    },
  });

  // CREATE CART IF NOT EXISTS
  if (!cart) {
    cart = await Cart.create({
      UserId: userId,
    });
  }

  let cartItem = await CartItem.findOne({
    where: {
      CartId: cart.id,
      ProductId: productId,
    },
  });

  if (cartItem) {
    const updatedQty = cartItem.quantity + quantity;

    if (updatedQty > product.stock) {
      throw new Error("Stock exceeded");
    }

    cartItem.quantity = updatedQty;

    await cartItem.save();
  } else {
    if (quantity > product.stock) {
      throw new Error("Stock exceeded");
    }

    await CartItem.create({
      CartId: cart.id,
      ProductId: product.id,
      quantity,
    });
  }
};
// get guest cart
exports.getUserCart = async (userId) => {
  let cart = await Cart.findOne({
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

  // IF NO CART EXISTS
  if (!cart) {
    return {
      items: [],
      total: 0,
    };
  }

  let total = 0;

  const items = (cart.CartItems || [])
    .map((item) => {
      if (!item.Product) return null;

      const subtotal = item.quantity * item.Product.price;

      total += subtotal;

      return {
        id: item.id,
        quantity: item.quantity,
        subtotal,
        product: item.Product,
      };
    })
    .filter(Boolean);

  return {
    items,
    total,
  };
};
// get user cart
exports.getUserCart = async (userId) => {
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

  if (!cart) {
    return {
      items: [],
      total: 0,
    };
  }

  let total = 0;

  const items = (cart.CartItems || []).map((item) => {
    const subtotal = item.quantity * item.Product.price;

    total += subtotal;

    return {
      id: item.id,
      quantity: item.quantity,
      subtotal,
      product: item.Product,
    };
  });

  return {
    items,
    total,
  };
};
// get guest cart
exports.getGuestCart = (session) => {
  if (!session.cart || !session.cart.items) {
    return {
      items: [],
      total: 0,
    };
  }

  let total = 0;

  const items = session.cart.items.map((item) => {
    const subtotal = item.quantity * item.product.price;
    total += subtotal;

    return {
      productId: item.productId,
      quantity: item.quantity,
      subtotal,
      product: item.product,
    };
  });

  return {
    items,
    total,
  };
};
// Update guest cart
exports.updateGuestCartItem = (session, productId, quantity) => {
  if (!session.cart) return;
  const item = session.cart.items.find((item) => item.productId == productId);
  if (!item) return;
  item.quantity = quantity;
};

// Update user cart
exports.updateUserCartItem = async (cartItemId, quantity) => {
  const cartItem = await CartItem.findByPk(cartItemId, {
    include: [Product],
  });
  if (!cartItem) {
    throw new Error("Cart item not found");
  }
  if (quantity > cartItem.Product.stock) {
    throw new Error("Stock exceeded");
  }
  cartItem.quantity = quantity;
  await cartItem.save();
};

// Remove guest cart item
exports.removeGuestCartItem = (session, productId) => {
  if (!session.cart) return;
  session.cart.items = session.cart.items.filter(
    (item) => item.productId != productId,
  );
};

// remove user caart item
exports.removeUserCartItem = async (cartItemId) => {
  const cartItem = await CartItem.findByPk(cartItemId);
  if (!cartItem) return;

  await cartItem.destroy();
};

// Merge guest cart into user cart
exports.mergeGuestCartToUserCart = async (session, userId) => {
  if (!session.cart || !session.cart.items || session.cart.items.length === 0) {
    return;
  }

  const userCart = await Cart.findOne({
    where: { UserId: userId },
  });

  if (!userCart) {
    // Create cart if not exists
    const newCart = await Cart.create({ UserId: userId });
    for (const item of session.cart.items) {
      await CartItem.create({
        CartId: newCart.id,
        ProductId: item.productId,
        quantity: item.quantity,
      });
    }
  } else {
    for (const guestItem of session.cart.items) {
      const existingItem = await CartItem.findOne({
        where: {
          CartId: userCart.id,
          ProductId: guestItem.productId,
        },
      });

      if (existingItem) {
        existingItem.quantity += guestItem.quantity;
        await existingItem.save();
      } else {
        await CartItem.create({
          CartId: userCart.id,
          ProductId: guestItem.productId,
          quantity: guestItem.quantity,
        });
      }
    }
  }

  // Clear guest cart
  session.cart = null;
};
