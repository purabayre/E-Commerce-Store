const User = require("./User");
const Product = require("./Product");
const Cart = require("./Cart");
const CartItem = require("./CartItem");
const Order = require("./Order");
const OrderItem = require("./OrderItem");
const Review = require("./Review");

User.hasOne(Cart);
Cart.belongsTo(User);

Cart.hasMany(CartItem);
CartItem.belongsTo(Cart);

CartItem.belongsTo(Product);

User.hasMany(Order);
Order.belongsTo(User);

Order.hasMany(OrderItem);
OrderItem.belongsTo(Order);

OrderItem.belongsTo(Product);
User.hasMany(Review, {
  foreignKey: "userId",
});

Review.belongsTo(User, {
  foreignKey: "userId",
});

Product.hasMany(Review, {
  foreignKey: "productId",
});

Review.belongsTo(Product, {
  foreignKey: "productId",
});

module.exports = {
  User,
  Product,
  Cart,
  CartItem,
  Order,
  OrderItem,
  Review,
};
