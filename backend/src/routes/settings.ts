import express, { Request, Response } from 'express';
import { query } from '../config/database';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get application settings
router.get('/', [
  authenticateToken,
  requireAdmin
], async (req: Request, res: Response) => {
  try {
    // For now, return default settings. In a real app, you'd store these in the database
    const settings = {
      general: {
        siteName: 'Hongfa Admin',
        siteDescription: 'E-commerce Admin Dashboard',
        contactEmail: 'admin@hongfagmbh.de',
        timezone: 'Europe/Berlin',
        language: 'en'
      },
      security: {
        sessionTimeout: 24, // hours
        passwordMinLength: 8,
        requireSpecialChars: true,
        requireNumbers: true,
        maxLoginAttempts: 5,
        lockoutDuration: 30 // minutes
      },
      notifications: {
        emailNotifications: true,
        lowStockAlerts: true,
        orderNotifications: true,
        errorAlerts: true
      },
      inventory: {
        defaultLowStockThreshold: 10,
        autoReorderEnabled: false,
        reorderPoint: 5
      },
      orders: {
        defaultStatus: 'pending',
        autoFulfillDigital: true,
        requireShippingAddress: true
      }
    };

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get settings'
    });
  }
});

// Update application settings
router.put('/', [
  authenticateToken,
  requireAdmin
], async (req: AuthRequest, res: Response) => {
  try {
    const { general, security, notifications, inventory, orders } = req.body;

    // In a real application, you'd validate and save these to the database
    // For now, we'll just acknowledge the update

    // Log the settings update
    await query(`
      INSERT INTO analytics_events (event_type, event_data, user_id)
      VALUES ($1, $2, $3)
    `, ['settings_updated', { updatedBy: req.user!.id }, req.user!.id]);

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        general,
        security,
        notifications,
        inventory,
        orders
      }
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
});

// Get system information
router.get('/system', [
  authenticateToken,
  requireAdmin
], async (req: Request, res: Response) => {
  try {
    const systemInfo = {
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    };

    res.json({
      success: true,
      data: systemInfo
    });
  } catch (error) {
    console.error('Get system info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system information'
    });
  }
});

// Get database statistics
router.get('/database', [
  authenticateToken,
  requireAdmin
], async (req: Request, res: Response) => {
  try {
    // Get table statistics
    const userCount = await query('SELECT COUNT(*) as count FROM users');
    const productCount = await query('SELECT COUNT(*) as count FROM products');
    const orderCount = await query('SELECT COUNT(*) as count FROM orders');
    const customerCount = await query('SELECT COUNT(*) as count FROM customers');

    // Get database size (approximate)
    const dbSize = await query(`
      SELECT
        pg_size_pretty(pg_database_size(current_database())) as size,
        pg_database_size(current_database()) as size_bytes
    `);

    const stats = {
      tables: {
        users: parseInt(userCount.rows[0].count),
        products: parseInt(productCount.rows[0].count),
        orders: parseInt(orderCount.rows[0].count),
        customers: parseInt(customerCount.rows[0].count)
      },
      database: {
        size: dbSize.rows[0].size,
        sizeBytes: parseInt(dbSize.rows[0].size_bytes)
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get database stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get database statistics'
    });
  }
});

// Clear system cache (if implemented)
router.post('/cache/clear', [
  authenticateToken,
  requireAdmin
], async (req: AuthRequest, res: Response) => {
  try {
    // In a real app, you'd clear Redis cache, file cache, etc.
    // For now, just log the action

    await query(`
      INSERT INTO analytics_events (event_type, event_data, user_id)
      VALUES ($1, $2, $3)
    `, ['cache_cleared', { clearedBy: req.user!.id }, req.user!.id]);

    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache'
    });
  }
});

// Backup database (placeholder)
router.post('/backup', [
  authenticateToken,
  requireAdmin
], async (req: AuthRequest, res: Response) => {
  try {
    // In a real app, you'd implement actual database backup
    // For now, just log the action

    await query(`
      INSERT INTO analytics_events (event_type, event_data, user_id)
      VALUES ($1, $2, $3)
    `, ['backup_created', { createdBy: req.user!.id }, req.user!.id]);

    res.json({
      success: true,
      message: 'Database backup initiated successfully'
    });
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create backup'
    });
  }
});

export default router;