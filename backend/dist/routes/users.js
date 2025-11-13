"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get all users with pagination and filters
router.get('/', [
    auth_1.authenticateToken,
    auth_1.requireAdmin,
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)('role').optional().isIn(['super_admin', 'admin', 'manager']),
    (0, express_validator_1.query)('status').optional().isIn(['active', 'inactive']),
    (0, express_validator_1.query)('search').optional().isLength({ min: 1, max: 100 })
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        const { page = 1, limit = 20, role, status, search } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        // Build WHERE clause
        let whereConditions = [];
        let params = [];
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
        const countResult = await (0, database_1.query)(countQuery, params);
        const totalCount = parseInt(countResult.rows[0].count);
        // Get users with pagination
        const usersQuery = `
      SELECT id, email, first_name, last_name, role, is_active, last_login, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
        params.push(parseInt(limit), offset);
        const usersResult = await (0, database_1.query)(usersQuery, params);
        res.json({
            success: true,
            data: {
                users: usersResult.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalCount,
                    pages: Math.ceil(totalCount / parseInt(limit))
                }
            }
        });
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get users'
        });
    }
});
// Get single user by ID
router.get('/:id', [
    auth_1.authenticateToken,
    auth_1.requireAdmin,
    (0, express_validator_1.param)('id').isUUID()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        const { id } = req.params;
        const result = await (0, database_1.query)('SELECT id, email, first_name, last_name, role, is_active, last_login, created_at, updated_at FROM users WHERE id = $1', [id]);
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
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user'
        });
    }
});
// Create new user
router.post('/', [
    auth_1.authenticateToken,
    auth_1.requireAdmin,
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 6 }),
    (0, express_validator_1.body)('firstName').isLength({ min: 1, max: 100 }),
    (0, express_validator_1.body)('lastName').isLength({ min: 1, max: 100 }),
    (0, express_validator_1.body)('role').isIn(['super_admin', 'admin', 'manager'])
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        const { email, password, firstName, lastName, role } = req.body;
        // Check if email already exists
        const emailCheck = await (0, database_1.query)('SELECT id FROM users WHERE email = $1', [email]);
        if (emailCheck.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcryptjs_1.default.hash(password, saltRounds);
        // Create user
        const result = await (0, database_1.query)(`
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, first_name, last_name, role, is_active, created_at
    `, [email, hashedPassword, firstName, lastName, role]);
        // Log analytics event
        await (0, database_1.query)(`
      INSERT INTO analytics_events (event_type, event_data, user_id)
      VALUES ($1, $2, $3)
    `, ['user_created', { userId: result.rows[0].id, email }, req.user.id]);
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: result.rows[0]
        });
    }
    catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create user'
        });
    }
});
// Update user
router.put('/:id', [
    auth_1.authenticateToken,
    auth_1.requireAdmin,
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.body)('email').optional().isEmail().normalizeEmail(),
    (0, express_validator_1.body)('firstName').optional().isLength({ min: 1, max: 100 }),
    (0, express_validator_1.body)('lastName').optional().isLength({ min: 1, max: 100 }),
    (0, express_validator_1.body)('role').optional().isIn(['super_admin', 'admin', 'manager']),
    (0, express_validator_1.body)('isActive').optional().isBoolean()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
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
        const userCheck = await (0, database_1.query)('SELECT id FROM users WHERE id = $1', [id]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        // Check email uniqueness if updating email
        if (email) {
            const emailCheck = await (0, database_1.query)('SELECT id FROM users WHERE email = $1 AND id != $2', [email, id]);
            if (emailCheck.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is already in use'
                });
            }
        }
        // Build update query
        const updates = {};
        const values = [];
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
        await (0, database_1.query)(`UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount}`, values);
        // Log analytics event
        await (0, database_1.query)(`
      INSERT INTO analytics_events (event_type, event_data, user_id)
      VALUES ($1, $2, $3)
    `, ['user_updated', { userId: id }, req.user.id]);
        res.json({
            success: true,
            message: 'User updated successfully'
        });
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user'
        });
    }
});
// Delete user
router.delete('/:id', [
    auth_1.authenticateToken,
    auth_1.requireAdmin,
    (0, express_validator_1.param)('id').isUUID()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }
        const { id } = req.params;
        // Prevent deleting self
        if (id === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
        }
        // Check if user exists
        const userCheck = await (0, database_1.query)('SELECT id, email FROM users WHERE id = $1', [id]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        const user = userCheck.rows[0];
        // Delete user
        await (0, database_1.query)('DELETE FROM users WHERE id = $1', [id]);
        // Log analytics event
        await (0, database_1.query)(`
      INSERT INTO analytics_events (event_type, event_data, user_id)
      VALUES ($1, $2, $3)
    `, ['user_deleted', { userId: id, email: user.email }, req.user.id]);
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user'
        });
    }
});
// Reset user password (admin only)
router.post('/:id/reset-password', [
    auth_1.authenticateToken,
    auth_1.requireAdmin,
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.body)('newPassword').isLength({ min: 6 })
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
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
        const userCheck = await (0, database_1.query)('SELECT id FROM users WHERE id = $1', [id]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        // Hash new password
        const saltRounds = 10;
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, saltRounds);
        // Update password
        await (0, database_1.query)('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hashedPassword, id]);
        // Log analytics event
        await (0, database_1.query)(`
      INSERT INTO analytics_events (event_type, event_data, user_id)
      VALUES ($1, $2, $3)
    `, ['password_reset', { userId: id }, req.user.id]);
        res.json({
            success: true,
            message: 'Password reset successfully'
        });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password'
        });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map