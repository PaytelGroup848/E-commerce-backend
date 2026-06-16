const Product = require('../models/Products.model');
const ProductVariant = require('../models/productvarient.model');
const Category = require('../models/Categories.model');
const ApiError = require('../utils/ApiError');

class ProductService {
  // Generate slug from name
  generateSlug(name) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Create product
  async createProduct(productData, userId, isAdmin = false) {
    const {
      name,
      description,
      shortDescription,
      category,
      subCategory,
      brand,
      price,
      originalPrice,
      stock,
      trackInventory = true,
      lowStockThreshold = 5,
      images = [],
      specifications = [],
      highlights = [],
      taxClass = 'gst_18',
      seo = {},
      tags = [],
      isFeatured = false
    } = productData;

    // Check if category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      throw new ApiError(404, 'Category not found');
    }

    // Generate slug
    let slug = this.generateSlug(name);
    let slugExists = await Product.findOne({ slug });
    let counter = 1;
    while (slugExists) {
      slug = `${this.generateSlug(name)}-${counter}`;
      slugExists = await Product.findOne({ slug });
      counter++;
    }

    // Calculate discount percent
    let discountPercent = 0;
    if (originalPrice && originalPrice > price) {
      discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
    }

    const product = await Product.create({
      name,
      slug,
      description,
      shortDescription,
      vendor: isAdmin ? null : userId,
      isAdminProduct: isAdmin,
      category,
      subCategory: subCategory || null,
      brand: brand || null,
      price,
      originalPrice: originalPrice || null,
      discountPercent,
      stock,
      trackInventory,
      lowStockThreshold,
      images,
      specifications,
      highlights,
      taxClass,
      seo,
      tags,
      isFeatured,
      status: isAdmin ? 'active' : 'draft'
    });

    // Update category product count
    await this.updateCategoryProductCount(category);

    return product;
  }

  // Get all products (public with filters)
  async getAllProducts(filters = {}, page = 1, limit = 20) {
    const query = { status: 'active' };
    
    // Apply filters
    if (filters.category) {
      query.category = filters.category;
    }
    
    if (filters.subCategory) {
      query.subCategory = filters.subCategory;
    }
    
    if (filters.vendor) {
      query.vendor = filters.vendor;
    }
    
    if (filters.minPrice || filters.maxPrice) {
      query.price = {};
      if (filters.minPrice) query.price.$gte = parseFloat(filters.minPrice);
      if (filters.maxPrice) query.price.$lte = parseFloat(filters.maxPrice);
    }
    
    if (filters.search) {
      query.$text = { $search: filters.search };
    }
    
    if (filters.tags) {
      query.tags = { $in: filters.tags.split(',') };
    }
    
    if (filters.isFeatured) {
      query.isFeatured = filters.isFeatured === 'true';
    }
    
    // Sorting
    let sort = {};
    switch (filters.sort) {
      case 'price_asc':
        sort = { price: 1 };
        break;
      case 'price_desc':
        sort = { price: -1 };
        break;
      case 'rating':
        sort = { rating: -1 };
        break;
      case 'newest':
        sort = { createdAt: -1 };
        break;
      case 'popular':
        sort = { totalSold: -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }
    
    const skip = (page - 1) * limit;
    
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('vendor', 'name email')
        .populate('category', 'name slug')
        .populate('subCategory', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query)
    ]);
    
    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get product by slug
  async getProductBySlug(slug) {
    const product = await Product.findOne({ slug, status: 'active' })
      .populate('vendor', 'name email')
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug');
    
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }
    
    // Increment view count
    product.viewCount += 1;
    await product.save();
    
    // Get variants if any
    const variants = await ProductVariant.find({ 
      product: product._id, 
      isActive: true 
    }).sort({ displayOrder: 1 });
    
    return { product, variants };
  }

  // Get product by ID (for vendor/admin)
  async getProductById(id) {
    const product = await Product.findById(id)
      .populate('vendor', 'name email')
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug');
    
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }
    
    const variants = await ProductVariant.find({ product: product._id });
    
    return { product, variants };
  }

  // Update product
  async updateProduct(id, updateData, userId, isAdmin = false) {
    const product = await Product.findById(id);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }
    
    // Check permission (vendor can only update their own products)
    if (!isAdmin && product.vendor && product.vendor.toString() !== userId) {
      throw new ApiError(403, 'You can only update your own products');
    }
    
    // If name is being updated, update slug
    if (updateData.name && updateData.name !== product.name) {
      updateData.slug = this.generateSlug(updateData.name);
      const existingSlug = await Product.findOne({ 
        slug: updateData.slug, 
        _id: { $ne: id } 
      });
      if (existingSlug) {
        updateData.slug = `${updateData.slug}-${Date.now()}`;
      }
    }
    
    // Recalculate discount percent if price changed
    if (updateData.price || updateData.originalPrice) {
      const newPrice = updateData.price || product.price;
      const newOriginalPrice = updateData.originalPrice || product.originalPrice;
      if (newOriginalPrice && newOriginalPrice > newPrice) {
        updateData.discountPercent = Math.round(((newOriginalPrice - newPrice) / newOriginalPrice) * 100);
      } else {
        updateData.discountPercent = 0;
      }
    }
    
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    // Update category product count if category changed
    if (updateData.category && updateData.category !== product.category) {
      await this.updateCategoryProductCount(product.category);
      await this.updateCategoryProductCount(updateData.category);
    }
    
    return updatedProduct;
  }

  // Delete product
  async deleteProduct(id, userId, isAdmin = false) {
    const product = await Product.findById(id);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }
    
    // Check permission
    if (!isAdmin && product.vendor && product.vendor.toString() !== userId) {
      throw new ApiError(403, 'You can only delete your own products');
    }
    
    // Delete all variants
    await ProductVariant.deleteMany({ product: id });
    
    // Delete product
    await product.deleteOne();
    
    // Update category product count
    await this.updateCategoryProductCount(product.category);
    
    return true;
  }

  // Update product status (vendor/admin)
  async updateProductStatus(id, status, userId, isAdmin = false, rejectionReason = null) {
    const product = await Product.findById(id);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }
    
    if (!isAdmin && product.vendor && product.vendor.toString() !== userId) {
      throw new ApiError(403, 'You can only update your own products');
    }
    
    product.status = status;
    if (rejectionReason) {
      product.rejectionReason = rejectionReason;
    }
    
    await product.save();
    
    return product;
  }

  // Get vendor products
  async getVendorProducts(vendorId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    const [products, total] = await Promise.all([
      Product.find({ vendor: vendorId })
        .populate('category', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments({ vendor: vendorId })
    ]);
    
    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Update category product count
  async updateCategoryProductCount(categoryId) {
    const count = await Product.countDocuments({ 
      category: categoryId, 
      status: 'active' 
    });
    await Category.findByIdAndUpdate(categoryId, { productCount: count });
  }
}

module.exports = new ProductService();