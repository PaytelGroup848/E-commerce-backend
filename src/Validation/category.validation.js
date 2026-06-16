const Joi = require('joi');

const createCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  parent: Joi.string().optional().allow(null, ''),
  description: Joi.string().max(500).optional().allow(''),
  displayOrder: Joi.number().min(0).default(0),
  isFeatured: Joi.boolean().default(false),
  image: Joi.object({
    url: Joi.string().uri().optional(),
    publicId: Joi.string().optional()
  }).optional(),
  seo: Joi.object({
    metaTitle: Joi.string().max(60).optional(),
    metaDescription: Joi.string().max(160).optional(),
    keywords: Joi.array().items(Joi.string()).optional()
  }).optional()
});

const updateCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  parent: Joi.string().optional().allow(null),
  description: Joi.string().max(500).optional(),
  displayOrder: Joi.number().min(0).optional(),
  isFeatured: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  image: Joi.object({
    url: Joi.string().uri().optional(),
    publicId: Joi.string().optional()
  }).optional(),
  seo: Joi.object({
    metaTitle: Joi.string().max(60).optional(),
    metaDescription: Joi.string().max(160).optional(),
    keywords: Joi.array().items(Joi.string()).optional()
  }).optional()
});

module.exports = {
  createCategorySchema,
  updateCategorySchema
};