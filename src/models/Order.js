const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Order = sequelize.define("Order", {
  status: {
    type: DataTypes.ENUM("pending", "processing", "shipped", "delivered"),

    defaultValue: "pending",
  },

  totalAmount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },

  stripeSessionId: {
    type: DataTypes.STRING,
  },

  processingAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  shippedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  deliveredAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});

module.exports = Order;
