const PDFDocument = require("pdfkit");

exports.generateInvoice = (order, res) => {
  const doc = new PDFDocument({
    margin: 50,
  });

  // Response headers
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename=invoice-${order.id}.pdf`,
  );

  doc.pipe(res);

  doc.fontSize(26).fillColor("#333").text("E-Commerce Store", {
    align: "center",
  });

  doc.moveDown();

  doc
    .fontSize(14)
    .fillColor("#000")
    .text(`Invoice #: ${order.id}`)
    .text(`Order Status: ${order.status}`)
    .text(`Date: ${new Date(order.createdAt).toLocaleString()}`);

  doc.moveDown(2);

  const tableTop = doc.y;

  doc
    .fontSize(12)
    .text("Product", 50, tableTop)
    .text("Qty", 300, tableTop)
    .text("Unit Price", 350, tableTop)
    .text("Total", 450, tableTop);

  doc
    .moveTo(50, tableTop + 20)
    .lineTo(550, tableTop + 20)
    .stroke();

  let position = tableTop + 35;

  let total = 0;

  order.OrderItems.forEach((item) => {
    const subtotal = item.quantity * item.priceAtPurchase;
    total += subtotal;

    doc
      .fontSize(11)
      .text(item.Product.name, 50, position)
      .text(item.quantity.toString(), 314, position)
      .text(`${item.priceAtPurchase}`, 390, position)
      .text(`${subtotal.toFixed(2)}`, 468, position);

    position += 25;
  });

  doc.moveDown(2);

  doc
    .fontSize(16)
    .fillColor("#000")
    .text(`Total: ${total.toFixed(2)}`, 416);

  doc.moveDown(3);

  doc
    .fontSize(10)
    .fillColor("gray")
    .text("Thank you for shopping with us!", 250);

  doc.end();
};
