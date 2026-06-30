const Order = require("../models/order.model");
const cashfreeService = require("../services/cashfree.service");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");

class PaymentController {
  async createCashfreeOrder(req, res, next) {
    try {
      const { orderId } = req.body;

      if (!orderId) {
        throw new ApiError(400, "Order ID is required");
      }

      const order = await Order.findOne({
        orderId,
        user: req.user._id,
      });

      if (!order) {
        throw new ApiError(404, "Order not found");
      }

      if (order.payment.status === "paid") {
        throw new ApiError(400, "Order is already paid");
      }

      order.payment.method = "cashfree";
      order.payment.status = "pending";

      const cashfreeOrder = await cashfreeService.createOrder(order);

      order.payment.cashfreeOrderId = cashfreeOrder.order_id;
      order.payment.orderId = cashfreeOrder.order_id;
      order.payment.paymentGatewayResponse = cashfreeOrder;

      await order.save();

      res.status(200).json(
        ApiResponse.success("Cashfree order created", {
          orderId: order.orderId,
          cashfreeOrderId: cashfreeOrder.order_id,
          paymentSessionId: cashfreeOrder.payment_session_id,
          orderAmount: cashfreeOrder.order_amount,
          orderCurrency: cashfreeOrder.order_currency,
        })
      );
    } catch (error) {
      next(error);
    }
  }

  async cashfreeWebhook(req, res, next) {
  try {
    const event = req.body;

    const cashfreeOrderId =
      event?.data?.order?.order_id ||
      event?.order_id;

    const paymentStatus =
      event?.data?.payment?.payment_status ||
      event?.payment_status;
      const  Order = require("../models/order.model");

    const cashfreePaymentId =
      event?.data?.payment?.cf_payment_id || Order
const cashfreeService = require("../services/cashfree.service");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");

class PaymentController {
  async createCashfreeOrder(req, res, next) {
    try {
      const { orderId } = req.body;

      if (!orderId) {
        throw new ApiError(400, "Order ID is required");
      }

      const order = await Order.findOne({
        orderId,
        user: req.user._id,
      });

      if (!order) {
        throw new ApiError(404, "Order not found");
      }

      if (order.payment.status === "paid") {
        throw new ApiError(400, "Order already paid");
      }

      order.payment.method = "cashfree";
      order.payment.status = "pending";

      const cashfreeOrder = await cashfreeService.createOrder(order);

      order.payment.cashfreeOrderId = cashfreeOrder.order_id;
      order.payment.orderId = cashfreeOrder.order_id;
      order.payment.paymentGatewayResponse = cashfreeOrder;

      await order.save();

      res.status(200).json(
        ApiResponse.success("Cashfree order created", {
          orderId: order.orderId,
          cashfreeOrderId: cashfreeOrder.order_id,
          paymentSessionId: cashfreeOrder.payment_session_id,
        })
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentController();
      event?.cf_payment_id ||
      null;

    if (!cashfreeOrderId) {
      return res.status(400).json({
        success: false,
        message: "Cashfree order id missing",
      });
    }

    const order = await Order.findOne({
      "payment.cashfreeOrderId": cashfreeOrderId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (paymentStatus === "SUCCESS" && order.payment.status !== "paid") {
      order.payment.status = "paid";
      order.payment.paymentId = cashfreePaymentId;
      order.payment.cashfreePaymentId = cashfreePaymentId;
      order.payment.cashfreeStatus = paymentStatus;
      order.payment.paidAt = new Date();
      order.payment.paymentGatewayResponse = event;

      order.status = "confirmed";
      order.confirmedAt = new Date();

      order.orderStatusHistory.push({
        status: "confirmed",
        message: "Payment successful. Order confirmed.",
      });

      await order.save();

      const emailService = require("../services/email.service");

      if (!order.payment.paymentEmailSent) {
        await emailService.sendPaymentSuccessEmail({
          email: order.customerEmail,
          name: order.customerName,
          orderNumber: order.orderId,
          paymentId: cashfreePaymentId || cashfreeOrderId,
          amount: order.total,
          paymentMethod: "Cashfree",
        });

        order.payment.paymentEmailSent = true;
        await order.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: "Webhook processed",
    });
  } catch (error) {
    next(error);
  }
}




}

module.exports = new PaymentController();