const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Order = sequelize.define("Order", {
  status: {
    type: DataTypes.STRING,
    defaultValue: "pending",
  },

  totalAmount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },

  stripeSessionId: {
    type: DataTypes.STRING,
    unique: true,
  },
});

module.exports = Order;
