const productService = require('../services/product.service');
const variantService = require('../services/variant.service');
const ApiResponse = require('../utils/ApiResponse');

class ProductController {
  // Create product (Vendor/Admin)
  async createProduct(req, res, next) {
    try {
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'sub_admin';
      const product = await productService.createProduct(req.body, req.user._id, isAdmin);
      res.status(201).json(
        ApiResponse.success('Product created successfully', { product })
      );
    } catch (error) {
      next(error);
    }
  }

  // Get all products (Public with filters)
  async getAllProducts(req, res, next) {
    try {
      const { page = 1, limit = 20, ...filters } = req.query;
      const result = await productService.getAllProducts(filters, parseInt(page), parseInt(limit));
      res.status(200).json(
        ApiResponse.success('Products fetched successfully', result)
      );
    } catch (error) {
      next(error);
    }
  }

  // Get product by slug (Public)
  async getProductBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      const result = await productService.getProductBySlug(slug);
      res.status(200).json(
        ApiResponse.success('Product fetched successfully', result)
      );
    } catch (error) {
      next(error);
    }
  }

  // Get product by ID (Vendor/Admin)
  async getProductById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await productService.getProductById(id);
      res.status(200).json(
        ApiResponse.success('Product fetched successfully', result)
      );
    } catch (error) {
      next(error);
    }
  }

  // Update product
  async updateProduct(req, res, next) {
    try {
      const { id } = req.params;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'sub_admin';
      const product = await productService.updateProduct(id, req.body, req.user._id, isAdmin);
      res.status(200).json(
        ApiResponse.success('Product updated successfully', { product })
      );
    } catch (error) {
      next(error);
    }
  }

  // Delete product
  async deleteProduct(req, res, next) {
    try {
      const { id } = req.params;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'sub_admin';
      await productService.deleteProduct(id, req.user._id, isAdmin);
      res.status(200).json(
        ApiResponse.success('Product deleted successfully')
      );
    } catch (error) {
      next(error);
    }
  }

  // Update product status (Vendor/Admin)
  async updateProductStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'sub_admin';
      const product = await productService.updateProductStatus(id, status, req.user._id, isAdmin, rejectionReason);
      res.status(200).json(
        ApiResponse.success('Product status updated successfully', { product })
      );
    } catch (error) {
      next(error);
    }
  }

  // Get vendor products
  async getVendorProducts(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await productService.getVendorProducts(req.user._id, parseInt(page), parseInt(limit));
      res.status(200).json(
        ApiResponse.success('Vendor products fetched successfully', result)
      );
    } catch (error) {
      next(error);
    }
  }

  // ==================== VARIANT CONTROLLERS ====================
  
  async createVariant(req, res, next) {
    try {
      const { productId } = req.params;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'sub_admin';
      const variant = await variantService.createVariant(productId, req.body, req.user._id, isAdmin);
      res.status(201).json(
        ApiResponse.success('Variant created successfully', { variant })
      );
    } catch (error) {
      next(error);
    }
  }

  async getVariantsByProduct(req, res, next) {
    try {
      const { productId } = req.params;
      const variants = await variantService.getVariantsByProduct(productId);
      res.status(200).json(
        ApiResponse.success('Variants fetched successfully', { variants })
      );
    } catch (error) {
      next(error);
    }
  }

  async updateVariant(req, res, next) {
    try {
      const { variantId } = req.params;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'sub_admin';
      const variant = await variantService.updateVariant(variantId, req.body, req.user._id, isAdmin);
      res.status(200).json(
        ApiResponse.success('Variant updated successfully', { variant })
      );
    } catch (error) {
      next(error);
    }
  }

  async deleteVariant(req, res, next) {
    try {
      const { variantId } = req.params;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'sub_admin';
      await variantService.deleteVariant(variantId, req.user._id, isAdmin);
      res.status(200).json(
        ApiResponse.success('Variant deleted successfully')
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();