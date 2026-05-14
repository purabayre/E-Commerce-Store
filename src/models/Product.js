const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Product = sequelize.define("Product", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },

  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },

  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },

  category: {
    type: DataTypes.STRING,
  },

  imagePath: {
    type: DataTypes.STRING,
  },

  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  averageRating: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },

  reviewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
});

module.exports = Product;
