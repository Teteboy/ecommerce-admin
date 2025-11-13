import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { query as dbQuery } from '../config/database';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all users with pagination and filters
router.get('/', [
  authenticateToken,
  requireAdmin,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('role').optional().isIn(['super_admin', 'admin', 'manager']),
  query('status').optional().isIn(['active', 'inactive']),
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
      role,
      status,
      search
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Build WHERE clause
    let whereConditions = [];
    let params: any[] = [];
    let paramCount = 1;

    if (role) {
      whereConditions.push(`role = $${paramCount}`);
      params.push(role);
      paramCount++;
    }

    if (status) {
      whereConditions.push(`is_active = $${paramCount}`);
      params.push(status === 'active');
      paramCount++;
    }

    if (search) {
      whereConditions.push(`(email ILIKE $${paramCount} OR first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
    const countResult = await dbQuery(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get users with pagination
    const usersQuery = `
      SELECT id, email, first_name, last_name, role, is_active, last_login, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    params.push(parseInt(limit as string), offset);

    const usersResult = await dbQuery(usersQuery, params);

    res.json({
      success: true,
      data: {
        users: usersResult.rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: totalCount,
          pages: Math.ceil(totalCount / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users'
    });
  }
});

// Get single user by ID
router.get('/:id', [
  authenticateToken,
  requireAdmin,
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

    const result = await dbQuery(
      'SELECT id, email, first_name, last_name, role, is_active, last_login, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user'
    });
  }
});

// Create new user
router.post('/', [
  authenticateToken,
  requireAdmin,
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('first_name').isLength({ min: 1, max: 100 }),
  body('last_name').isLength({ min: 1, max: 100 }),
  body('role').isIn(['super_admin', 'admin', 'manager']),
  body('status').optional().isBoolean()
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

    const { email, password, first_name, last_name, role, status } = req.body;

    // Check if email already exists
    const emailCheck = await dbQuery('SELECT id FROM users WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await dbQuery(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, first_name, last_name, role, is_active, created_at
    `, [email, hashedPassword, first_name, last_name, role, status !== undefined ? status : true]);

    // Log analytics event
    await dbQuery(`
      INSERT INTO analytics_events (event_type, event_data, user_id)
      VALUES ($1, $2, $3)
    `, ['user_created', { userId: result.rows[0].id, email }, req.user!.id]);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
});

// Update user
router.put('/:id', [
  authenticateToken,
  requireAdmin,
  param('id').isUUID(),
  body('email').optional().isEmail().normalizeEmail(),
  body('firstName').optional().isLength({ min: 1, max: 100 }),
  body('lastName').optional().isLength({ min: 1, max: 100 }),
  body('role').optional().isIn(['super_admin', 'admin', 'manager']),
  body('isActive').optional().isBoolean()
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
    const { email, firstName, lastName, role, isActive } = req.body;

    // Check if user exists
    const userCheck = await dbQuery('SELECT id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check email uniqueness if updating email
    if (email) {
      const emailCheck = await dbQuery('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
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

    if (role !== undefined) {
      updates.role = `$${paramCount}`;
      values.push(role);
      paramCount++;
    }

    if (isActive !== undefined) {
      updates.is_active = `$${paramCount}`;
      values.push(isActive);
      paramCount++;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    // Update user
    const setClause = Object.keys(updates).map(key => `${updates[key]}`).join(', ');
    values.push(id);

    await dbQuery(
      `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount}`,
      values
    );

    // Log analytics event
    await dbQuery(`
      INSERT INTO analytics_events (event_type, event_data, user_id)
      VALUES ($1, $2, $3)
    `, ['user_updated', { userId: id }, req.user!.id]);

    res.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

// Delete user
router.delete('/:id', [
  authenticateToken,
  requireAdmin,
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

    // Prevent deleting self
    if (id === req.user!.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Check if user exists
    const userCheck = await dbQuery('SELECT id, email FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userCheck.rows[0];

    // Delete user
    await dbQuery('DELETE FROM users WHERE id = $1', [id]);

    // Log analytics event
    await dbQuery(`
      INSERT INTO analytics_events (event_type, event_data, user_id)
      VALUES ($1, $2, $3)
    `, ['user_deleted', { userId: id, email: user.email }, req.user!.id]);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

// Reset user password (admin only)
router.post('/:id/reset-password', [
  authenticateToken,
  requireAdmin,
  param('id').isUUID(),
  body('newPassword').isLength({ min: 8 })
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
    const { newPassword } = req.body;

    // Check if user exists
    const userCheck = await dbQuery('SELECT id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await dbQuery(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, id]
    );

    // Log analytics event
    await dbQuery(`
      INSERT INTO analytics_events (event_type, event_data, user_id)
      VALUES ($1, $2, $3)
    `, ['password_reset', { userId: id }, req.user!.id]);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

// Bulk operations
router.post('/bulk', [
  authenticateToken,
  requireAdmin,
  body('operation').isIn(['activate', 'deactivate', 'delete']),
  body('userIds').isArray({ min: 1 }),
  body('userIds.*').isUUID()
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

    const { operation, userIds } = req.body;

    // Prevent self-operation
    if (userIds.includes(req.user!.id)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot perform operation on your own account'
      });
    }

    let query: string;
    let params: any[];

    switch (operation) {
      case 'activate':
        query = 'UPDATE users SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($1)';
        params = [userIds];
        break;
      case 'deactivate':
        query = 'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($1)';
        params = [userIds];
        break;
      case 'delete':
        query = 'DELETE FROM users WHERE id = ANY($1)';
        params = [userIds];
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid operation'
        });
    }

    const result = await dbQuery(query, params);

    // Log analytics event
    await dbQuery(`
      INSERT INTO analytics_events (event_type, event_data, user_id)
      VALUES ($1, $2, $3)
    `, ['bulk_user_operation', { operation, userIds, affectedCount: result.rowCount }, req.user!.id]);

    res.json({
      success: true,
      message: `Bulk ${operation} completed successfully`,
      data: {
        affectedCount: result.rowCount
      }
    });
  } catch (error) {
    console.error('Bulk operation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk operation'
    });
  }
});

export default router;