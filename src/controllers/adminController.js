const path = require("path");
const fs = require("fs");
const { validationResult } = require("express-validator");
const { Product } = require("../models");

exports.getProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: {
        isActive: true,
      },
      order: [["createdAt", "DESC"]],
    });

    res.render("admin/products", {
      pageTitle: "Admin Products",
      products,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
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
    if (!product) {
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
    if (!product) {
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
    if (!product) {
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
