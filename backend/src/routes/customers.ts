import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { query as dbQuery } from '../config/database';
import { authenticateToken, requireManager, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all customers with pagination and filters
router.get('/', [
  authenticateToken,
  requireManager,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isLength({ min: 1, max: 100 })
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
      search
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Build WHERE clause
    let whereConditions = [];
    let params: any[] = [];
    let paramCount = 1;

    if (search) {
      whereConditions.push(`(email ILIKE $${paramCount} OR first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR company ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM customers ${whereClause}`;
    const countResult = await dbQuery(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get customers with pagination
    const customersQuery = `
      SELECT
        id,
        email,
        first_name,
        last_name,
        phone,
        company,
        accepts_marketing,
        total_orders,
        total_spent,
        last_order_date,
        created_at,
        updated_at
      FROM customers
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    params.push(parseInt(limit as string), offset);

    const customersResult = await dbQuery(customersQuery, params);

    res.json({
      success: true,
      data: {
        customers: customersResult.rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: totalCount,
          pages: Math.ceil(totalCount / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customers'
    });
  }
});

// Get single customer by ID
router.get('/:id', [
  authenticateToken,
  requireManager,
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

    const result = await dbQuery(`
      SELECT
        c.*,
        json_agg(
          json_build_object(
            'id', ca.id,
            'type', ca.type,
            'first_name', ca.first_name,
            'last_name', ca.last_name,
            'company', ca.company,
            'address_line_1', ca.address_line_1,
            'address_line_2', ca.address_line_2,
            'city', ca.city,
            'state', ca.state,
            'postal_code', ca.postal_code,
            'country', ca.country,
            'phone', ca.phone,
            'is_default', ca.is_default
          )
        ) FILTER (WHERE ca.id IS NOT NULL) as addresses
      FROM customers c
      LEFT JOIN customer_addresses ca ON c.id = ca.customer_id
      WHERE c.id = $1
      GROUP BY c.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customer'
    });
  }
});

// Create new customer
router.post('/', [
  authenticateToken,
  requireManager,
  body('email').isEmail().normalizeEmail(),
  body('firstName').optional().isLength({ min: 1, max: 100 }),
  body('lastName').optional().isLength({ min: 1, max: 100 }),
  body('phone').optional().isLength({ min: 1, max: 50 }),
  body('company').optional().isLength({ min: 1, max: 255 })
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

    const { email, firstName, lastName, phone, company } = req.body;

    // Check if email already exists
    const emailCheck = await dbQuery('SELECT id FROM customers WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Create customer
    const result = await dbQuery(`
      INSERT INTO customers (email, first_name, last_name, phone, company)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, first_name, last_name, phone, company, created_at
    `, [email, firstName, lastName, phone, company]);

    // Log analytics event
    await dbQuery(`
      INSERT INTO analytics_events (event_type, event_data, user_id)
      VALUES ($1, $2, $3)
    `, ['customer_created', { customerId: result.rows[0].id, email }, req.user!.id]);

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create customer'
    });
  }
});

// Update customer
router.put('/:id', [
  authenticateToken,
  requireManager,
  param('id').isUUID(),
  body('email').optional().isEmail().normalizeEmail(),
  body('firstName').optional().isLength({ min: 1, max: 100 }),
  body('lastName').optional().isLength({ min: 1, max: 100 }),
  body('phone').optional().isLength({ min: 1, max: 50 }),
  body('company').optional().isLength({ min: 1, max: 255 }),
  body('acceptsMarketing').optional().isBoolean()
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
    const { email, firstName, lastName, phone, company, acceptsMarketing } = req.body;

    // Check if customer exists
    const customerCheck = await dbQuery('SELECT id FROM customers WHERE id = $1', [id]);
    if (customerCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check email uniqueness if updating email
    if (email) {
      const emailCheck = await dbQuery('SELECT id FROM customers WHERE email = $1 AND id != $2', [email, id]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email is already in use'
        });
      }
    }

    // Build update query
    const updates: any = {};
    const values: any[] = [];
    let paramCount = 1;

    if (email !== undefined) {
      updates.email = `$${paramCount}`;
      values.push(email);
      paramCount++;
    }

    if (firstName !== undefined) {
      updates.first_name = `$${paramCount}`;
      values.push(firstName);
      paramCount++;
    }

    if (lastName !== undefined) {
      updates.last_name = `$${paramCount}`;
      values.push(lastName);
      paramCount++;
    }

    if (phone !== undefined) {
      updates.phone = `$${paramCount}`;
      values.push(phone);
      paramCount++;
    }

    if (company !== undefined) {
      updates.company = `$${paramCount}`;
      values.push(company);
      paramCount++;
    }

    if (acceptsMarketing !== undefined) {
      updates.accepts_marketing = `$${paramCount}`;
      values.push(acceptsMarketing);
      paramCount++;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    // Update customer
    const setClause = Object.keys(updates).map(key => `${key} = ${updates[key]}`).join(', ');
    values.push(id);

    await dbQuery(
      `UPDATE customers SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount}`,
      values
    );

    // Log analytics event
    await dbQuery(`
      INSERT INTO analytics_events (event_type, event_data, user_id)
      VALUES ($1, $2, $3)
    `, ['customer_updated', { customerId: id }, req.user!.id]);

    res.json({
      success: true,
      message: 'Customer updated successfully'
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update customer'
    });
  }
});

// Delete customer
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

    // Check if customer exists
    const customerCheck = await dbQuery('SELECT id, email FROM customers WHERE id = $1', [id]);
    if (customerCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const customer = customerCheck.rows[0];

    // Delete customer (this will cascade to addresses and orders)
    await dbQuery('DELETE FROM customers WHERE id = $1', [id]);

    // Log analytics event
    await dbQuery(`
      INSERT INTO analytics_events (event_type, event_data, user_id)
      VALUES ($1, $2, $3)
    `, ['customer_deleted', { customerId: id, email: customer.email }, req.user!.id]);

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete customer'
    });
  }
});

export default router;