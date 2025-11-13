import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { query as dbQuery } from '../config/database';
import { authenticateToken, requireManager, AuthRequest } from '../middleware/auth';
import { io } from '../server';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') // 5MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Get all products with pagination and filters
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isUUID(),
  query('search').optional().isLength({ min: 1, max: 100 }),
  query('status').optional().isIn(['active', 'inactive']),
  query('sortBy').optional().isIn(['name', 'price', 'created_at', 'stock_quantity']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      page = 1,
      limit = 20,
      category,
      search,
      status,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Build WHERE clause
    let whereConditions = [];
    let params: any[] = [];
    let paramCount = 1;

    if (category) {
      whereConditions.push(`p.id IN (SELECT product_id FROM product_categories WHERE category_id = $${paramCount})`);
      params.push(category);
      paramCount++;
    }

    if (search) {
      whereConditions.push(`(p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount} OR p.sku ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }

    if (status) {
      whereConditions.push(`p.is_active = $${paramCount}`);
      params.push(status === 'active');
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM products p ${whereClause}`;
    const countResult = await dbQuery(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get products with pagination
    const productsQuery = `
      SELECT
        p.*,
        COALESCE(json_agg(DISTINCT pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') as images,
        COALESCE(json_agg(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL), '[]') as categories
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.${sortBy} ${sortOrder}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    params.push(parseInt(limit as string), offset);

    const productsResult = await dbQuery(productsQuery, params);

    const products = productsResult.rows.map(product => ({
      ...product,
      images: Array.isArray(product.images) ? product.images : [],
      categories: Array.isArray(product.categories) ? product.categories : []
    }));

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: totalCount,
          pages: Math.ceil(totalCount / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get products'
    });
  }
});

// Get single product by ID
router.get('/:id', [
  param('id').isUUID()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;

    // Get product with all details
    const productQuery = `
      SELECT
        p.*,
        COALESCE(json_agg(DISTINCT pi.*) FILTER (WHERE pi.id IS NOT NULL), '[]') as images,
        COALESCE(json_agg(DISTINCT json_build_object('id', c.id, 'name', c.name, 'slug', c.slug)) FILTER (WHERE c.id IS NOT NULL), '[]') as categories,
        COALESCE(json_agg(DISTINCT pv.*) FILTER (WHERE pv.id IS NOT NULL), '[]') as variants
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      WHERE p.id = $1
      GROUP BY p.id
    `;

    const result = await dbQuery(productQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const product = result.rows[0];
    product.images = Array.isArray(product.images) ? product.images : [];
    product.categories = Array.isArray(product.categories) ? product.categories : [];
    product.variants = Array.isArray(product.variants) ? product.variants : [];

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get product'
    });
  }
});

// Create new product
router.post('/', [
  authenticateToken,
  requireManager,
  body('name').isLength({ min: 1, max: 255 }),
  body('sku').isLength({ min: 1, max: 100 }),
  body('price').isFloat({ min: 0 }),
  body('description').optional(),
  body('shortDescription').optional().isLength({ max: 500 }),
  body('categoryIds').optional().isArray(),
  body('stockQuantity').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean(),
  body('isFeatured').optional().isBoolean()
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      name,
      sku,
      price,
      description,
      shortDescription,
      categoryIds = [],
      stockQuantity = 0,
      isActive = true,
      isFeatured = false,
      weight,
      dimensions,
      seoTitle,
      seoDescription,
      tags = []
    } = req.body;

    // Check if SKU already exists
    const skuCheck = await dbQuery('SELECT id FROM products WHERE sku = $1', [sku]);
    if (skuCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists'
      });
    }

    // Generate slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Insert product
    const insertQuery = `
      INSERT INTO products (
        name, slug, sku, price, description, short_description,
        stock_quantity, is_active, is_featured, weight, dimensions,
        seo_title, seo_description, tags
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const values = [
      name, slug, sku, price, description, shortDescription,
      stockQuantity, isActive, isFeatured, weight, JSON.stringify(dimensions),
      seoTitle, seoDescription, tags
    ];

    const result = await dbQuery(insertQuery, values);
    const product = result.rows[0];

    // Add categories
    if (categoryIds.length > 0) {
      const categoryValues = categoryIds.map((categoryId: string) =>
        `('${product.id}', '${categoryId}')`
      ).join(', ');

      await dbQuery(`
        INSERT INTO product_categories (product_id, category_id)
        VALUES ${categoryValues}
      `);
    }

    // Log analytics event
    await dbQuery(`
      INSERT INTO analytics_events (event_type, event_data, user_id)
      VALUES ($1, $2, $3)
    `, ['product_created', { productId: product.id, name: product.name }, req.user!.id]);

    // Emit real-time update
    io.emit('product-created', { product: product });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product'
    });
  }
});

// Update product
router.put('/:id', [
  authenticateToken,
  requireManager,
  param('id').isUUID(),
  body('name').optional().isLength({ min: 1, max: 255 }),
  body('sku').optional().isLength({ min: 1, max: 100 }),
  body('price').optional().isFloat({ min: 0 }),
  body('description').optional(),
  body('shortDescription').optional().isLength({ max: 500 }),
  body('categoryIds').optional().isArray(),
  body('stockQuantity').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean(),
  body('isFeatured').optional().isBoolean()
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const {
      name,
      sku,
      price,
      description,
      shortDescription,
      categoryIds,
      stockQuantity,
      isActive,
      isFeatured,
      weight,
      dimensions,
      seoTitle,
      seoDescription,
      tags
    } = req.body;

    // Check if product exists
    const productCheck = await dbQuery('SELECT id FROM products WHERE id = $1', [id]);
    if (productCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check SKU uniqueness if updating SKU
    if (sku) {
      const skuCheck = await dbQuery('SELECT id FROM products WHERE sku = $1 AND id != $2', [sku, id]);
      if (skuCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'SKU already exists'
        });
      }
    }

    // Build update query
    const updates: any = {};
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.name = `$${paramCount}`;
      updates.slug = `$${paramCount + 1}`;
      values.push(name, name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
      paramCount += 2;
    }

    if (sku !== undefined) {
      updates.sku = `$${paramCount}`;
      values.push(sku);
      paramCount++;
    }

    if (price !== undefined) {
      updates.price = `$${paramCount}`;
      values.push(price);
      paramCount++;
    }

    if (description !== undefined) {
      updates.description = `$${paramCount}`;
      values.push(description);
      paramCount++;
    }

    if (shortDescription !== undefined) {
      updates.short_description = `$${paramCount}`;
      values.push(shortDescription);
      paramCount++;
    }

    if (stockQuantity !== undefined) {
      updates.stock_quantity = `$${paramCount}`;
      values.push(stockQuantity);
      paramCount++;
    }

    if (isActive !== undefined) {
      updates.is_active = `$${paramCount}`;
      values.push(isActive);
      paramCount++;
    }

    if (isFeatured !== undefined) {
      updates.is_featured = `$${paramCount}`;
      values.push(isFeatured);
      paramCount++;
    }

    if (weight !== undefined) {
      updates.weight = `$${paramCount}`;
      values.push(weight);
      paramCount++;
    }

    if (dimensions !== undefined) {
      updates.dimensions = `$${paramCount}`;
      values.push(JSON.stringify(dimensions));
      paramCount++;
    }

    if (seoTitle !== undefined) {
      updates.seo_title = `$${paramCount}`;
      values.push(seoTitle);
      paramCount++;
    }

    if (seoDescription !== undefined) {
      updates.seo_description = `$${paramCount}`;
      values.push(seoDescription);
      paramCount++;
    }

    if (tags !== undefined) {
      updates.tags = `$${paramCount}`;
      values.push(tags);
      paramCount++;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    // Update product
    const setClause = Object.keys(updates).map(key => `${key} = ${updates[key]}`).join(', ');
    values.push(id);

    await dbQuery(
      `UPDATE products SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount}`,
      values
    );

    // Update categories if provided
    if (categoryIds !== undefined) {
      // Remove existing categories
      await dbQuery('DELETE FROM product_categories WHERE product_id = $1', [id]);

      // Add new categories
      if (categoryIds.length > 0) {
        const categoryValues = categoryIds.map((categoryId: string) =>
          `('${id}', '${categoryId}')`
        ).join(', ');

        await dbQuery(`
          INSERT INTO product_categories (product_id, category_id)
          VALUES ${categoryValues}
        `);
      }
    }

    // Log analytics event
    await dbQuery(`
      INSERT INTO analytics_events (event_type, event_data, user_id)
      VALUES ($1, $2, $3)
    `, ['product_updated', { productId: id }, req.user!.id]);

    // Emit real-time update
    io.emit('product-updated', { productId: id });

    res.json({
      success: true,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product'
    });
  }
});

// Delete product
router.delete('/:id', [
  authenticateToken,
  requireManager,
  param('id').isUUID()
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;

    // Check if product exists
    const productCheck = await dbQuery('SELECT id, name FROM products WHERE id = $1', [id]);
    if (productCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const product = productCheck.rows[0];

    // Delete product (cascade will handle related records)
    await dbQuery('DELETE FROM products WHERE id = $1', [id]);

    // Log analytics event
    await dbQuery(`
      INSERT INTO analytics_events (event_type, event_data, user_id)
      VALUES ($1, $2, $3)
    `, ['product_deleted', { productId: id, name: product.name }, req.user!.id]);

    // Emit real-time update
    io.emit('product-deleted', { productId: id });

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product'
    });
  }
});

// Upload product images
router.post('/:id/images', [
  authenticateToken,
  requireManager,
  param('id').isUUID()
], upload.array('images', 10), async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    // Check if product exists
    const productCheck = await dbQuery('SELECT id FROM products WHERE id = $1', [id]);
    if (productCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Insert images
    const imageInserts = files.map((file, index) => ({
      product_id: id,
      image_url: `/uploads/${file.filename}`,
      alt_text: file.originalname,
      sort_order: index,
      is_primary: index === 0 // First image is primary
    }));

    for (const image of imageInserts) {
      await dbQuery(`
        INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
        VALUES ($1, $2, $3, $4, $5)
      `, [image.product_id, image.image_url, image.alt_text, image.sort_order, image.is_primary]);
    }

    res.json({
      success: true,
      message: `${files.length} image(s) uploaded successfully`,
      data: imageInserts
    });
  } catch (error) {
    console.error('Upload images error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload images'
    });
  }
});

// Get product categories
router.get('/categories/all', async (req: Request, res: Response) => {
  try {
    const result = await dbQuery(
      'SELECT id, name, slug, description FROM categories WHERE is_active = true ORDER BY sort_order, name'
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get categories'
    });
  }
});

export default router;