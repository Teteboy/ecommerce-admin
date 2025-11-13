import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { query as dbQuery } from '../config/database';
import { authenticateToken, requireManager, AuthRequest } from '../middleware/auth';
import { io } from '../server';

const router = express.Router();

// Get all orders with pagination and filters
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
  query('paymentStatus').optional().isIn(['pending', 'paid', 'failed', 'refunded', 'partially_refunded']),
  query('search').optional().isLength({ min: 1, max: 100 }),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('sortBy').optional().isIn(['created_at', 'total', 'order_number']),
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
      status,
      paymentStatus,
      search,
      dateFrom,
      dateTo,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Build WHERE clause
    let whereConditions = [];
    let params: any[] = [];
    let paramCount = 1;

    if (status) {
      whereConditions.push(`o.status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (paymentStatus) {
      whereConditions.push(`o.payment_status = $${paramCount}`);
      params.push(paymentStatus);
      paramCount++;
    }

    if (search) {
      whereConditions.push(`(o.order_number ILIKE $${paramCount} OR c.email ILIKE $${paramCount} OR c.first_name ILIKE $${paramCount} OR c.last_name ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }

    if (dateFrom) {
      whereConditions.push(`o.created_at >= $${paramCount}`);
      params.push(dateFrom);
      paramCount++;
    }

    if (dateTo) {
      whereConditions.push(`o.created_at <= $${paramCount}`);
      params.push(dateTo);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM orders o LEFT JOIN customers c ON o.customer_id = c.id ${whereClause}`;
    const countResult = await dbQuery(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get orders with pagination
    const ordersQuery = `
      SELECT
        o.*,
        json_build_object(
          'id', c.id,
          'email', c.email,
          'firstName', c.first_name,
          'lastName', c.last_name,
          'phone', c.phone,
          'company', c.company
        ) as customer,
        COALESCE(json_agg(
          json_build_object(
            'id', oi.id,
            'productName', oi.product_name,
            'sku', oi.sku,
            'quantity', oi.quantity,
            'price', oi.price,
            'total', oi.total
          )
        ) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      ${whereClause}
      GROUP BY o.id, c.id
      ORDER BY o.${sortBy} ${sortOrder}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    params.push(parseInt(limit as string), offset);

    const ordersResult = await dbQuery(ordersQuery, params);

    const orders = ordersResult.rows.map(order => ({
      ...order,
      items: Array.isArray(order.items) ? order.items : []
    }));

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: totalCount,
          pages: Math.ceil(totalCount / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get orders'
    });
  }
});

// Get single order by ID
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

    // Get order with all details
    const orderQuery = `
      SELECT
        o.*,
        json_build_object(
          'id', c.id,
          'email', c.email,
          'firstName', c.first_name,
          'lastName', c.last_name,
          'phone', c.phone,
          'company', c.company
        ) as customer,
        json_build_object(
          'firstName', ba.first_name,
          'lastName', ba.last_name,
          'company', ba.company,
          'addressLine1', ba.address_line_1,
          'addressLine2', ba.address_line_2,
          'city', ba.city,
          'state', ba.state,
          'postalCode', ba.postal_code,
          'country', ba.country
        ) as billingAddress,
        json_build_object(
          'firstName', sa.first_name,
          'lastName', sa.last_name,
          'company', sa.company,
          'addressLine1', sa.address_line_1,
          'addressLine2', sa.address_line_2,
          'city', sa.city,
          'state', sa.state,
          'postalCode', sa.postal_code,
          'country', sa.country
        ) as shippingAddress,
        COALESCE(json_agg(
          json_build_object(
            'id', oi.id,
            'productId', oi.product_id,
            'variantId', oi.variant_id,
            'productName', oi.product_name,
            'variantName', oi.variant_name,
            'sku', oi.sku,
            'quantity', oi.quantity,
            'price', oi.price,
            'total', oi.total
          )
        ) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN customer_addresses ba ON o.billing_address_id = ba.id
      LEFT JOIN customer_addresses sa ON o.shipping_address_id = sa.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1
      GROUP BY o.id, c.id, ba.id, sa.id
    `;

    const result = await dbQuery(orderQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = result.rows[0];
    order.items = Array.isArray(order.items) ? order.items : [];

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order'
    });
  }
});

// Update order status
router.put('/:id/status', [
  authenticateToken,
  requireManager,
  param('id').isUUID(),
  body('status').isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
  body('paymentStatus').optional().isIn(['pending', 'paid', 'failed', 'refunded', 'partially_refunded']),
  body('notes').optional().isLength({ max: 1000 })
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
    const { status, paymentStatus, notes } = req.body;

    // Check if order exists
    const orderCheck = await dbQuery('SELECT id, status, payment_status FROM orders WHERE id = $1', [id]);
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const currentOrder = orderCheck.rows[0];

    // Update order
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    updateFields.push(`status = $${paramCount}`);
    updateValues.push(status);
    paramCount++;

    if (paymentStatus !== undefined) {
      updateFields.push(`payment_status = $${paramCount}`);
      updateValues.push(paymentStatus);
      paramCount++;
    }

    if (notes !== undefined) {
      updateFields.push(`notes = $${paramCount}`);
      updateValues.push(notes);
      paramCount++;
    }

    updateValues.push(id);

    await dbQuery(
      `UPDATE orders SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount}`,
      updateValues
    );

    // Log status change
    await dbQuery(`
      INSERT INTO analytics_events (event_type, event_data, user_id)
      VALUES ($1, $2, $3)
    `, ['order_status_changed', {
      orderId: id,
      oldStatus: currentOrder.status,
      newStatus: status,
      oldPaymentStatus: currentOrder.payment_status,
      newPaymentStatus: paymentStatus
    }, req.user!.id]);

    // Emit real-time update
    io.emit('order-updated', {
      orderId: id,
      status,
      paymentStatus,
      updatedBy: req.user!.id
    });

    res.json({
      success: true,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
});

// Create new order (for manual order creation)
router.post('/', [
  authenticateToken,
  requireManager,
  body('customerId').optional().isUUID(),
  body('customerEmail').optional().isEmail(),
  body('customerFirstName').optional().isLength({ min: 1, max: 100 }),
  body('customerLastName').optional().isLength({ min: 1, max: 100 }),
  body('items').isArray({ min: 1 }),
  body('items.*.productId').isUUID(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('billingAddress').optional(),
  body('shippingAddress').optional(),
  body('notes').optional().isLength({ max: 1000 })
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
      customerId,
      customerEmail,
      customerFirstName,
      customerLastName,
      items,
      billingAddress,
      shippingAddress,
      notes
    } = req.body;

    let finalCustomerId = customerId;

    // Create customer if not exists
    if (!customerId && customerEmail) {
      const customerCheck = await dbQuery('SELECT id FROM customers WHERE email = $1', [customerEmail]);

      if (customerCheck.rows.length > 0) {
        finalCustomerId = customerCheck.rows[0].id;
      } else {
        const customerResult = await dbQuery(`
          INSERT INTO customers (email, first_name, last_name)
          VALUES ($1, $2, $3)
          RETURNING id
        `, [customerEmail, customerFirstName || '', customerLastName || '']);

        finalCustomerId = customerResult.rows[0].id;
      }
    }

    // Calculate totals
    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      // Get product details
      const productResult = await dbQuery(
        'SELECT name, sku, price FROM products WHERE id = $1 AND is_active = true',
        [item.productId]
      );

      if (productResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.productId} not found or inactive`
        });
      }

      const product = productResult.rows[0];
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      processedItems.push({
        productId: item.productId,
        productName: product.name,
        sku: product.sku,
        quantity: item.quantity,
        price: product.price,
        total: itemTotal
      });
    }

    const taxAmount = subtotal * 0.19; // 19% German VAT
    const total = subtotal + taxAmount;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Create order
    const orderResult = await dbQuery(`
      INSERT INTO orders (
        order_number, customer_id, subtotal, tax_amount, total,
        currency, notes, status, payment_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
      orderNumber, finalCustomerId, subtotal, taxAmount, total,
      'EUR', notes, 'confirmed', 'paid'
    ]);

    const orderId = orderResult.rows[0].id;

    // Create order items
    for (const item of processedItems) {
      await dbQuery(`
        INSERT INTO order_items (
          order_id, product_id, product_name, sku, quantity, price, total
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        orderId, item.productId, item.productName, item.sku,
        item.quantity, item.price, item.total
      ]);
    }

    // Update customer order count and total spent
    if (finalCustomerId) {
      await dbQuery(`
        UPDATE customers
        SET total_orders = total_orders + 1,
            total_spent = total_spent + $2,
            last_order_date = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [finalCustomerId, total]);
    }

    // Log analytics event
    await dbQuery(`
      INSERT INTO analytics_events (event_type, event_data, user_id)
      VALUES ($1, $2, $3)
    `, ['order_created', { orderId, orderNumber, total }, req.user!.id]);

    // Emit real-time update
    io.emit('order-created', { orderId, orderNumber });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderId,
        orderNumber,
        total
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order'
    });
  }
});

// Get order statistics
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const statsQuery = `
      SELECT
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status = 'delivered') as completed_orders,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
        COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_orders,
        COALESCE(SUM(total) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'), 0) as revenue_30_days,
        COALESCE(SUM(total), 0) as total_revenue,
        AVG(total) as average_order_value
      FROM orders
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `;

    const result = await dbQuery(statsQuery);
    const stats = result.rows[0];

    res.json({
      success: true,
      data: {
        totalOrders: parseInt(stats.total_orders),
        completedOrders: parseInt(stats.completed_orders),
        pendingOrders: parseInt(stats.pending_orders),
        paidOrders: parseInt(stats.paid_orders),
        revenue30Days: parseFloat(stats.revenue_30_days),
        totalRevenue: parseFloat(stats.total_revenue),
        averageOrderValue: parseFloat(stats.average_order_value) || 0
      }
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order statistics'
    });
  }
});

export default router;