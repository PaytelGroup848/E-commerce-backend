const axios = require("axios");
const ApiError = require("../utils/ApiError");

const CASHFREE_ENV = process.env.CASHFREE_ENV || "sandbox";

const CASHFREE_BASE_URL =
  CASHFREE_ENV === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

class CashfreeService {
  constructor() {
    this.clientId = process.env.CASHFREE_APP_ID;
    this.clientSecret = process.env.CASHFREE_SECRET_KEY;
    this.apiVersion = process.env.CASHFREE_API_VERSION || "2023-08-01";

    if (!this.clientId || !this.clientSecret) {
      console.warn("⚠️ Cashfree credentials missing");
    }
  }

  async createOrder(order) {
    try {
      const payload = {
        order_id: order.orderId,
        order_amount: Number(order.total),
        order_currency: "INR",
        customer_details: {
          customer_id: order.user.toString(),
          customer_name: order.customerName,
          customer_email: order.customerEmail,
          customer_phone: order.customerPhone,
        },
        order_meta: {
          return_url: `${process.env.FRONTEND_URL}/payment/success?order_id=${order.orderId}`,
        },
      };

      const response = await axios.post(
        `${CASHFREE_BASE_URL}/orders`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            "x-client-id": this.clientId,
            "x-client-secret": this.clientSecret,
            "x-api-version": this.apiVersion,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Cashfree create order error:", error.response?.data || error.message);
      throw new ApiError(500, "Failed to create Cashfree payment order");
    }
  }
}

module.exports = new CashfreeService();