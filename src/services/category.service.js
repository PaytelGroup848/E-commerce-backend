const Category = require('../models/Categories.model');
const ApiError = require('../utils/ApiError');

class CategoryService {
  // Create slug from name
  generateSlug(name) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Create category
  async createCategory(categoryData, userId, userRole) {
    const { name, parent, description, image, displayOrder, isFeatured, seo } = categoryData;
    
    const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingCategory) {
      throw new ApiError(400, 'Category with this name already exists');
    }
    
    const slug = this.generateSlug(name);
    const existingSlug = await Category.findOne({ slug });
    if (existingSlug) {
      throw new ApiError(400, 'Category with this slug already exists');
    }
    
    let level = 1;
    let ancestors = [];
    
    if (parent) {
      const parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        throw new ApiError(404, 'Parent category not found');
      }
      level = parentCategory.level + 1;
      if (level > 4) {
        throw new ApiError(400, 'Maximum category level (4) exceeded');
      }
      ancestors = [...parentCategory.ancestors, {
        _id: parentCategory._id,
        name: parentCategory.name,
        slug: parentCategory.slug
      }];
    }
    
    const category = await Category.create({
      name,
      slug,
      description,
      parent: parent || null,
      level,
      ancestors,
      image,
      displayOrder: displayOrder || 0,
      isFeatured: isFeatured || false,
      seo,
      isActive: true,
      productCount: 0,
      createdBy: userId,
      createdByRole: userRole
    });
    
    return category;
  }

  // Get all categories (with tree structure)
  async getAllCategories() {
    const categories = await Category.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 });
    
    const categoryMap = {};
    const roots = [];
    
    categories.forEach(category => {
      categoryMap[category._id] = { ...category.toObject(), children: [] };
    });
    
    categories.forEach(category => {
      const categoryObj = categoryMap[category._id];
      if (category.parent && categoryMap[category.parent]) {
        categoryMap[category.parent].children.push(categoryObj);
      } else {
        roots.push(categoryObj);
      }
    });
    
    return roots;
  }

  // Get all categories flat (for admin)
  async getAllCategoriesFlat(userRole, userId) {
    let query = {};
    if (userRole === 'vendor') {
      query = {
        $or: [
          { createdBy: userId },
          { createdByRole: { $in: ['super_admin', 'sub_admin'] } }
        ]
      };
    }
    
    const categories = await Category.find(query)
      .populate('parent', 'name slug')
      .populate('createdBy', 'name email')
      .sort({ level: 1, displayOrder: 1, name: 1 });
    
    return categories;
  }

  // Get category by slug
  async getCategoryBySlug(slug) {
    const category = await Category.findOne({ slug, isActive: true })
      .populate('parent', 'name slug');
    
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }
    
    return category;
  }

  // Get category by ID
  async getCategoryById(id) {
    const category = await Category.findById(id)
      .populate('parent', 'name slug');
    
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }
    
    return category;
  }

  // Update category
  async updateCategory(id, updateData, userRole, userId) {
    const category = await Category.findById(id);
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }
    
    if (userRole === 'vendor' && category.createdBy?.toString() !== userId) {
      throw new ApiError(403, 'You can only update categories you created');
    }
    
    if (updateData.name && updateData.name !== category.name) {
      updateData.slug = this.generateSlug(updateData.name);
      const existingSlug = await Category.findOne({ 
        slug: updateData.slug, 
        _id: { $ne: id } 
      });
      if (existingSlug) {
        throw new ApiError(400, 'Category with this slug already exists');
      }
    }
    
    if (updateData.parent !== undefined && updateData.parent !== category.parent) {
      if (updateData.parent === null) {
        updateData.level = 1;
        updateData.ancestors = [];
      } else {
        const parentCategory = await Category.findById(updateData.parent);
        if (!parentCategory) {
          throw new ApiError(404, 'Parent category not found');
        }
        updateData.level = parentCategory.level + 1;
        if (updateData.level > 4) {
          throw new ApiError(400, 'Maximum category level (4) exceeded');
        }
        updateData.ancestors = [...parentCategory.ancestors, {
          _id: parentCategory._id,
          name: parentCategory.name,
          slug: parentCategory.slug
        }];
      }
    }
    
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    return updatedCategory;
  }

  // Delete category
  async deleteCategory(id, userRole, userId) {
    const category = await Category.findById(id);
    if (!category) {
      throw new ApiError(404, 'Category not found');
    }
    
    if (userRole === 'vendor' && category.createdBy?.toString() !== userId) {
      throw new ApiError(403, 'You can only delete categories you created');
    }
    
    const childrenCount = await Category.countDocuments({ parent: id });
    if (childrenCount > 0) {
      throw new ApiError(400, 'Cannot delete category with subcategories');
    }
    
    if (category.productCount > 0) {
      throw new ApiError(400, 'Cannot delete category with products');
    }
    
    await category.deleteOne();
    return true;
  }

  // Get featured categories
  async getFeaturedCategories(limit = 6) {
    const categories = await Category.find({ isActive: true, isFeatured: true })
      .limit(limit)
      .sort({ displayOrder: 1, name: 1 });
    
    return categories;
  }

  // Update product count
  async updateProductCount(categoryId) {
    const Product = require('../models/Products.model');
    const count = await Product.countDocuments({ 
      category: categoryId, 
      status: 'active' 
    });
    await Category.findByIdAndUpdate(categoryId, { productCount: count });
  }
}

module.exports = new CategoryService();