const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = sequelize.define("User", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: false,
  },

  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  role: {
    type: DataTypes.ENUM("user", "admin"),
    defaultValue: "user",
  },

  resetToken: DataTypes.STRING,

  resetTokenExpiry: DataTypes.DATE,
});

module.exports = User;
