import express, { Request, Response } from 'express';
import { query } from '../config/database';
import { authenticateToken, requireManager, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get inventory overview with stats
router.get('/', [
  authenticateToken,
  requireManager
], async (req: Request, res: Response) => {
  try {
    // Get inventory statistics
    const statsQuery = `
      SELECT
        COUNT(*) as total_products,
        COUNT(*) FILTER (WHERE is_active = true) as active_products,
        COUNT(*) FILTER (WHERE stock_quantity <= low_stock_threshold AND stock_quantity > 0) as low_stock_products,
        COUNT(*) FILTER (WHERE stock_quantity = 0) as out_of_stock_products,
        SUM(stock_quantity) as total_stock_quantity,
        SUM(stock_quantity * price) as total_inventory_value
      FROM products
    `;

    const statsResult = await query(statsQuery);

    // Get inventory items with details
    const inventoryQuery = `
      SELECT
        p.id,
        p.name,
        p.sku,
        p.price,
        p.stock_quantity,
        p.low_stock_threshold,
        p.is_active,
        p.created_at,
        p.updated_at,
        COALESCE(json_agg(DISTINCT pi.image_url) FILTER (WHERE pi.image_url IS NOT NULL), '[]') as images,
        COALESCE(json_agg(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL), '[]') as categories
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id
      GROUP BY p.id, p.name, p.sku, p.price, p.stock_quantity, p.low_stock_threshold, p.is_active, p.created_at, p.updated_at
      ORDER BY p.created_at DESC
    `;

    const inventoryResult = await query(inventoryQuery);

    res.json({
      success: true,
      data: {
        stats: statsResult.rows[0],
        inventory: inventoryResult.rows
      }
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get inventory'
    });
  }
});

// Adjust stock quantity
router.post('/adjust', [
  authenticateToken,
  requireManager
], async (req: AuthRequest, res: Response) => {
  try {
    const { productId, type, quantity, reason } = req.body;

    if (!productId || !type || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, type, and quantity are required'
      });
    }

    // Get current stock
    const currentStockResult = await query(
      'SELECT stock_quantity FROM products WHERE id = $1',
      [productId]
    );

    if (currentStockResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const currentStock = currentStockResult.rows[0].stock_quantity;
    let newStock = currentStock;

    switch (type) {
      case 'add':
        newStock = currentStock + quantity;
        break;
      case 'remove':
        newStock = Math.max(0, currentStock - quantity);
        break;
      case 'set':
        newStock = Math.max(0, quantity);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid adjustment type'
        });
    }

    // Update stock
    await query(
      'UPDATE products SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newStock, productId]
    );

    // Log inventory transaction
    await query(`
      INSERT INTO inventory_transactions (
        product_id,
        transaction_type,
        quantity,
        reason,
        created_by
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      productId,
      type === 'add' ? 'stock_in' : type === 'remove' ? 'stock_out' : 'adjustment',
      quantity,
      reason || 'Manual adjustment',
      req.user!.id
    ]);

    res.json({
      success: true,
      message: 'Stock adjusted successfully',
      data: {
        previousStock: currentStock,
        newStock,
        adjustment: newStock - currentStock
      }
    });
  } catch (error) {
    console.error('Adjust stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to adjust stock'
    });
  }
});

// Set reorder point
router.post('/reorder-point', [
  authenticateToken,
  requireManager
], async (req: AuthRequest, res: Response) => {
  try {
    const { productId, reorderPoint } = req.body;

    if (!productId || reorderPoint === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and reorder point are required'
      });
    }

    if (reorderPoint < 0) {
      return res.status(400).json({
        success: false,
        message: 'Reorder point must be non-negative'
      });
    }

    // Update reorder point
    await query(
      'UPDATE products SET low_stock_threshold = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [reorderPoint, productId]
    );

    res.json({
      success: true,
      message: 'Reorder point updated successfully'
    });
  } catch (error) {
    console.error('Set reorder point error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set reorder point'
    });
  }
});

// Get low stock alerts
router.get('/alerts', [
  authenticateToken,
  requireManager
], async (req: Request, res: Response) => {
  try {
    const alertsQuery = `
      SELECT
        id,
        name,
        sku,
        stock_quantity,
        low_stock_threshold,
        CASE
          WHEN stock_quantity = 0 THEN 'out_of_stock'
          WHEN stock_quantity <= low_stock_threshold THEN 'low_stock'
          ELSE 'normal'
        END as alert_level
      FROM products
      WHERE is_active = true
        AND (stock_quantity = 0 OR stock_quantity <= low_stock_threshold)
      ORDER BY stock_quantity ASC
    `;

    const alertsResult = await query(alertsQuery);

    res.json({
      success: true,
      data: alertsResult.rows
    });
  } catch (error) {
    console.error('Get inventory alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get inventory alerts'
    });
  }
});

// Get inventory transaction history
router.get('/transactions', [
  authenticateToken,
  requireManager
], async (req: Request, res: Response) => {
  try {
    const { productId, limit = 50 } = req.query;

    let queryText = `
      SELECT
        it.*,
        p.name as product_name,
        p.sku as product_sku,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM inventory_transactions it
      JOIN products p ON it.product_id = p.id
      LEFT JOIN users u ON it.created_by = u.id
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (productId) {
      queryText += ` WHERE it.product_id = $${paramCount}`;
      params.push(productId);
      paramCount++;
    }

    queryText += ` ORDER BY it.created_at DESC LIMIT $${paramCount}`;
    params.push(parseInt(limit as string));

    const transactionsResult = await query(queryText, params);

    res.json({
      success: true,
      data: transactionsResult.rows
    });
  } catch (error) {
    console.error('Get inventory transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get inventory transactions'
    });
  }
});

export default router;