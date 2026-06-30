const express = require("express");
const router = express.Router();

const paymentController = require("../../controllers/payment.controller");
const { protect } = require("../../middlewares/auth.middleware");

router.post(
  "/cashfree/create-order",
  protect,
  paymentController.createCashfreeOrder
);

module.exports = router;