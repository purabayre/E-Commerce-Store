const express = require("express");
const router = express.Router();

const stripe = require("../config/stripe");

router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const signature = req.headers["stripe-signature"];
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "payment_intent.payment_failed") {
      console.log("Payment failed");
    }

    res.json({ received: true });
  },
);

module.exports = router;
