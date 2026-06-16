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

  // Generate SKU if not provided
  generateSku(name) {
    const prefix = name.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  }

  // Create product with full schema support
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
      stock = 0,
      trackInventory = true,
      lowStockThreshold = 5,
      images = [],
      specifications = [],
      highlights = [],
      taxClass = 'gst_18',
      seo = {},
      tags = [],
      isFeatured = false,
      sku,
    } = productData;

    // ─── VALIDATION ───────────────────────────────────────
    if (!name || !name.trim()) {
      throw new ApiError(400, 'Product name is required');
    }
    if (!description || !description.trim()) {
      throw new ApiError(400, 'Product description is required');
    }
    if (!price || price <= 0) {
      throw new ApiError(400, 'Valid product price is required');
    }
    if (!category) {
      throw new ApiError(400, 'Category is required');
    }

    // ─── CHECK CATEGORY ──────────────────────────────────
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      throw new ApiError(404, 'Category not found');
    }

    // Check subCategory if provided
    if (subCategory) {
      const subCategoryExists = await Category.findById(subCategory);
      if (!subCategoryExists) {
        throw new ApiError(404, 'Sub-category not found');
      }
    }

    // ─── GENERATE SLUG ────────────────────────────────────
    let slug = this.generateSlug(name);
    let slugExists = await Product.findOne({ slug });
    let counter = 1;
    while (slugExists) {
      slug = `${this.generateSlug(name)}-${counter}`;
      slugExists = await Product.findOne({ slug });
      counter++;
    }

    // ─── ✅ FIX: Handle SKU properly ──────────────────────
    let finalSku = null;
    if (sku && sku.trim()) {
      // Check if SKU exists
      const existingSku = await Product.findOne({ sku: sku.trim() });
      if (existingSku) {
        throw new ApiError(400, 'Product with this SKU already exists');
      }
      finalSku = sku.trim();
    }
    // ✅ If no SKU provided, generate one
    else {
      finalSku = this.generateSku(name);
      // Check if generated SKU exists (rare but possible)
      let skuExists = await Product.findOne({ sku: finalSku });
      while (skuExists) {
        finalSku = this.generateSku(name + Math.random().toString(36).substr(2, 3));
        skuExists = await Product.findOne({ sku: finalSku });
      }
    }

    // ─── CALCULATE DISCOUNT ──────────────────────────────
    let discountPercent = 0;
    if (originalPrice && originalPrice > price) {
      discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
    }

    // ─── SET VENDOR ID ────────────────────────────────────
    const vendorId = isAdmin ? null : userId;

    // ─── CREATE PRODUCT ──────────────────────────────────
    const product = await Product.create({
      name: name.trim(),
      slug,
      description: description.trim(),
      shortDescription: shortDescription?.trim() || '',
      sku: finalSku,
      vendor: vendorId,
      isAdminProduct: isAdmin,
      category,
      subCategory: subCategory || null,
      brand: brand || null,
      price,
      originalPrice: originalPrice || null,
      discountPercent,
      taxClass: taxClass || 'gst_18',
      stock: stock || 0,
      trackInventory: trackInventory !== undefined ? trackInventory : true,
      lowStockThreshold: lowStockThreshold || 5,
      images: images || [],
      specifications: specifications || [],
      highlights: highlights || [],
      seo: {
        metaTitle: seo?.metaTitle || '',
        metaDescription: seo?.metaDescription || '',
        keywords: seo?.keywords || [],
      },
      tags: tags || [],
      isFeatured: isFeatured || false,
      status: isAdmin ? 'active' : 'draft',
    });

    // ─── UPDATE CATEGORY COUNT ──────────────────────────
    await this.updateCategoryProductCount(category);

    return product;
  }

  // Get all products (public with filters)
  async getAllProducts(filters = {}, page = 1, limit = 20) {
    const query = { status: 'active' };

    if (filters.category) query.category = filters.category;
    if (filters.subCategory) query.subCategory = filters.subCategory;
    if (filters.vendor) query.vendor = filters.vendor;

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

    if (filters.hasVariants) {
      query.hasVariants = filters.hasVariants === 'true';
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
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
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

    product.viewCount += 1;
    await product.save();

    const variants = await ProductVariant.find({
      product: product._id,
      isActive: true,
    }).sort({ displayOrder: 1 });

    return { product, variants };
  }

  // Get product by ID
  async getProductById(id) {
    const product = await Product.findById(id)
      .populate('vendor', 'name email')
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug');

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    const variants = await ProductVariant.find({ product: product._id }).sort({
      displayOrder: 1,
    });

    return { product, variants };
  }

  // Update product
  async updateProduct(id, updateData, userId, isAdmin = false) {
    const product = await Product.findById(id);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    // Check permission
    if (!isAdmin && product.vendor && product.vendor.toString() !== userId) {
      throw new ApiError(403, 'You can only update your own products');
    }

    // If name is being updated, update slug
    if (updateData.name && updateData.name !== product.name) {
      updateData.slug = this.generateSlug(updateData.name);
      const existingSlug = await Product.findOne({
        slug: updateData.slug,
        _id: { $ne: id },
      });
      if (existingSlug) {
        updateData.slug = `${updateData.slug}-${Date.now()}`;
      }
    }

    // Recalculate discount percent
    if (updateData.price || updateData.originalPrice) {
      const newPrice = updateData.price || product.price;
      const newOriginalPrice = updateData.originalPrice || product.originalPrice;
      if (newOriginalPrice && newOriginalPrice > newPrice) {
        updateData.discountPercent = Math.round(
          ((newOriginalPrice - newPrice) / newOriginalPrice) * 100
        );
      } else {
        updateData.discountPercent = 0;
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

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

    if (!isAdmin && product.vendor && product.vendor.toString() !== userId) {
      throw new ApiError(403, 'You can only delete your own products');
    }

    await ProductVariant.deleteMany({ product: id });
    await product.deleteOne();
    await this.updateCategoryProductCount(product.category);

    return true;
  }

  // Update product status
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
        .populate('subCategory', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments({ vendor: vendorId }),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Update category product count
  async updateCategoryProductCount(categoryId) {
    const count = await Product.countDocuments({
      category: categoryId,
      status: 'active',
    });
    await Category.findByIdAndUpdate(categoryId, { productCount: count });
  }

  // Get featured products
  async getFeaturedProducts(limit = 8) {
    const products = await Product.find({
      status: 'active',
      isFeatured: true,
    })
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate('category', 'name slug');

    return products;
  }

  // Get products by category
  async getProductsByCategory(categoryId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find({
        category: categoryId,
        status: 'active',
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('category', 'name slug'),
      Product.countDocuments({
        category: categoryId,
        status: 'active',
      }),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Search products
  async searchProducts(searchTerm, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(
        { $text: { $search: searchTerm }, status: 'active' },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit)
        .populate('category', 'name slug'),
      Product.countDocuments({
        $text: { $search: searchTerm },
        status: 'active',
      }),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new ProductService();