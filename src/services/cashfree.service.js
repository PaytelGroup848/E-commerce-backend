const axios = require('axios');
const ApiError = require('../utils/ApiError');

class CashfreeService {
  constructor() {
    this.appId = process.env.CASHFREE_APP_ID;
    this.secretKey = process.env.CASHFREE_SECRET_KEY;
    this.apiVersion = process.env.CASHFREE_API_VERSION || '2025-01-01';

    this.baseUrl =
      process.env.CASHFREE_ENV === 'production'
        ? 'https://api.cashfree.com/pg'
        : 'https://sandbox.cashfree.com/pg';
  }

  getHeaders() {
    if (!this.appId || !this.secretKey) {
      throw new ApiError(500, 'Cashfree credentials missing in backend .env');
    }

    return {
      'Content-Type': 'application/json',
      'x-api-version': this.apiVersion,
      'x-client-id': this.appId,
      'x-client-secret': this.secretKey,
    };
  }

  async createOrder(order) {
    try {
      const customerName =
        order.customerName ||
        order.shippingAddress?.fullName ||
        order.user?.name ||
        'Customer';

      const customerEmail =
        order.customerEmail ||
        order.user?.email ||
        'customer@example.com';

      const customerPhone =
        order.customerPhone ||
        order.shippingAddress?.phone ||
        order.user?.phone ||
        '9999999999';

      const payload = {
        order_id: String(order.orderId),
        order_amount: Number(order.total),
        order_currency: 'INR',

        customer_details: {
          customer_id: String(order.user?._id || order.user || order._id),
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: String(customerPhone),
        },

        order_meta: {
          return_url: `${process.env.FRONTEND_URL}/payment/cashfree/success?order_id=${order.orderId}`,
          notify_url: `${process.env.BACKEND_URL}/api/v1/payments/cashfree/webhook`,
        },

        order_note: `Payment for order ${order.orderId}`,
      };

      const response = await axios.post(`${this.baseUrl}/orders`, payload, {
        headers: this.getHeaders(),
      });

      return response.data;
    } catch (error) {
      console.error(
        'Cashfree create order error:',
        error?.response?.data || error.message
      );

      throw new ApiError(
        error?.response?.status || 500,
        error?.response?.data?.message || 'Failed to create Cashfree order'
      );
    }
  }

  async getOrder(cashfreeOrderId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/orders/${cashfreeOrderId}`,
        {
          headers: this.getHeaders(),
        }
      );

      return response.data;
    } catch (error) {
      console.error(
        'Cashfree get order error:',
        error?.response?.data || error.message
      );

      throw new ApiError(
        error?.response?.status || 500,
        error?.response?.data?.message || 'Failed to fetch Cashfree order'
      );
    }
  }
}

module.exports = new CashfreeService();