const axios = require("axios");
const crypto = require("crypto");
const ApiError = require("../utils/ApiError");

const CASHFREE_BASE_URL =
  process.env.CASHFREE_ENV === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

class CashfreeService {
  constructor() {
    this.appId = process.env.CASHFREE_APP_ID;
    this.secretKey = process.env.CASHFREE_SECRET_KEY;
    this.apiVersion = process.env.CASHFREE_API_VERSION || "2023-08-01";
  }

  getHeaders() {
    if (!this.appId || !this.secretKey) {
      throw new ApiError(500, "Cashfree credentials are missing");
    }

    return {
      "Content-Type": "application/json",
      "x-client-id": this.appId,
      "x-client-secret": this.secretKey,
      "x-api-version": this.apiVersion,
    };
  }

  async createPaymentOrder(order) {
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
      order_note: `QubanHC order ${order.orderId}`,
    };

    try {
      const response = await axios.post(
        `${CASHFREE_BASE_URL}/orders`,
        payload,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      console.error("Cashfree create order error:", error.response?.data || error.message);
      throw new ApiError(502, "Unable to start payment. Please try again.");
    }
  }

  async fetchOrder(cashfreeOrderId) {
    try {
      const response = await axios.get(
        `${CASHFREE_BASE_URL}/orders/${cashfreeOrderId}`,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      console.error("Cashfree fetch order error:", error.response?.data || error.message);
      throw new ApiError(502, "Unable to verify payment order");
    }
  }

  async fetchPayments(cashfreeOrderId) {
    try {
      const response = await axios.get(
        `${CASHFREE_BASE_URL}/orders/${cashfreeOrderId}/payments`,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      console.error("Cashfree fetch payments error:", error.response?.data || error.message);
      throw new ApiError(502, "Unable to fetch payment status");
    }
  }

  verifyWebhookSignature(rawBody, timestamp, signature) {
    if (!rawBody || !timestamp || !signature) {
      return false;
    }

    const signedPayload = timestamp + rawBody;

    const expectedSignature = crypto
      .createHmac("sha256", this.secretKey)
      .update(signedPayload)
      .digest("base64");

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );
  }
}

module.exports = new CashfreeService();