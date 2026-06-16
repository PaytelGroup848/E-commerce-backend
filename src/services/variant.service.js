const ProductVariant = require('../models/productvarient.model');
const Product = require('../models/Products.model');
const ApiError = require('../utils/ApiError');

class VariantService {
  // Create variant
  async createVariant(productId, variantData, userId, isAdmin = false) {
    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }
    
    // Check permission
    if (!isAdmin && product.vendor && product.vendor.toString() !== userId) {
      throw new ApiError(403, 'You can only add variants to your own products');
    }
    
    // Check if SKU is unique
    if (variantData.sku) {
      const existingSku = await ProductVariant.findOne({ sku: variantData.sku });
      if (existingSku) {
        throw new ApiError(400, 'SKU already exists');
      }
    }
    
    const variant = await ProductVariant.create({
      product: productId,
      ...variantData,
      isActive: true
    });
    
    // Update product hasVariants flag
    if (!product.hasVariants) {
      product.hasVariants = true;
      await product.save();
    }
    
    return variant;
  }

  // Get variants by product
  async getVariantsByProduct(productId) {
    const variants = await ProductVariant.find({ 
      product: productId, 
      isActive: true 
    }).sort({ displayOrder: 1 });
    
    return variants;
  }

  // Update variant
  async updateVariant(variantId, updateData, userId, isAdmin = false) {
    const variant = await ProductVariant.findById(variantId);
    if (!variant) {
      throw new ApiError(404, 'Variant not found');
    }
    
    const product = await Product.findById(variant.product);
    if (!isAdmin && product.vendor && product.vendor.toString() !== userId) {
      throw new ApiError(403, 'You can only update variants of your own products');
    }
    
    const updatedVariant = await ProductVariant.findByIdAndUpdate(
      variantId,
      updateData,
      { new: true, runValidators: true }
    );
    
    return updatedVariant;
  }

  // Delete variant
  async deleteVariant(variantId, userId, isAdmin = false) {
    const variant = await ProductVariant.findById(variantId);
    if (!variant) {
      throw new ApiError(404, 'Variant not found');
    }
    
    const product = await Product.findById(variant.product);
    if (!isAdmin && product.vendor && product.vendor.toString() !== userId) {
      throw new ApiError(403, 'You can only delete variants of your own products');
    }
    
    await variant.deleteOne();
    
    // Check if product has any remaining variants
    const remainingVariants = await ProductVariant.countDocuments({ 
      product: variant.product,
      isActive: true 
    });
    
    if (remainingVariants === 0) {
      product.hasVariants = false;
      await product.save();
    }
    
    return true;
  }
}

module.exports = new VariantService();