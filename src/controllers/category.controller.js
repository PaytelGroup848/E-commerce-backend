const categoryService = require('../services/category.service');
const ApiResponse = require('../utils/ApiResponse');

class CategoryController {
  // Create category
  async createCategory(req, res, next) {
    try {
      const category = await categoryService.createCategory(
        req.body, 
        req.user._id,
        req.user.role
      );
      res.status(201).json(
        ApiResponse.success('Category created successfully', { category })
      );
    } catch (error) {
      next(error);
    }
  }

  // Get all categories (Public - tree structure)
  async getAllCategories(req, res, next) {
    try {
      const categories = await categoryService.getAllCategories();
      res.status(200).json(
        ApiResponse.success('Categories fetched successfully', { categories })
      );
    } catch (error) {
      next(error);
    }
  }

  // Get all categories flat (for admin panel)
  async getAllCategoriesFlat(req, res, next) {
    try {
      const categories = await categoryService.getAllCategoriesFlat(
        req.user.role,
        req.user._id
      );
      res.status(200).json(
        ApiResponse.success('Categories fetched successfully', { categories })
      );
    } catch (error) {
      next(error);
    }
  }

  // Get category by slug
  async getCategoryBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      const category = await categoryService.getCategoryBySlug(slug);
      res.status(200).json(
        ApiResponse.success('Category fetched successfully', { category })
      );
    } catch (error) {
      next(error);
    }
  }

  // Get category by ID
  async getCategoryById(req, res, next) {
    try {
      const { id } = req.params;
      const category = await categoryService.getCategoryById(id);
      res.status(200).json(
        ApiResponse.success('Category fetched successfully', { category })
      );
    } catch (error) {
      next(error);
    }
  }

  // Update category
  async updateCategory(req, res, next) {
    try {
      const { id } = req.params;
      const category = await categoryService.updateCategory(id, req.body, req.user.role, req.user._id);
      res.status(200).json(
        ApiResponse.success('Category updated successfully', { category })
      );
    } catch (error) {
      next(error);
    }
  }

  // Delete category
  async deleteCategory(req, res, next) {
    try {
      const { id } = req.params;
      await categoryService.deleteCategory(id, req.user.role, req.user._id);
      res.status(200).json(
        ApiResponse.success('Category deleted successfully')
      );
    } catch (error) {
      next(error);
    }
  }

  // Get featured categories
  async getFeaturedCategories(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 6;
      const categories = await categoryService.getFeaturedCategories(limit);
      res.status(200).json(
        ApiResponse.success('Featured categories fetched successfully', { categories })
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CategoryController();