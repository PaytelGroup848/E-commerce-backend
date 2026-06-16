const express = require('express');
const router = express.Router();
const categoryController = require('../../controllers/category.controller');
const { protect, restrictTo } = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validation.middleware');
const { createCategorySchema, updateCategorySchema } = require('../../Validation/category.validation');

// ==================== PUBLIC ROUTES ====================
router.get('/', categoryController.getAllCategories);
router.get('/featured', categoryController.getFeaturedCategories);
router.get('/slug/:slug', categoryController.getCategoryBySlug);

// ==================== PROTECTED ROUTES ====================
router.use(protect);

// Admin + Vendor can create categories
router.post('/', validate(createCategorySchema), categoryController.createCategory);
router.put('/:id', validate(updateCategorySchema), categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);
router.get('/:id', categoryController.getCategoryById);

// Admin only routes
router.get('/admin/all', restrictTo('super_admin', 'sub_admin'), categoryController.getAllCategoriesFlat);

module.exports = router;