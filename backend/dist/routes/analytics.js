"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Get dashboard overview statistics
router.get('/dashboard/overview', [
    auth_1.authenticateToken,
    auth_1.requireManager
], async (req, res) => {
    try {
        // Get order statistics
        const orderStats = await (0, database_1.query)(`
      SELECT
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status = 'delivered') as completed_orders,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
        COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_orders,
        COALESCE(SUM(total) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'), 0) as revenue_30_days,
        COALESCE(SUM(total), 0) as total_revenue,
        AVG(total) as average_order_value
      FROM orders
    `);
        // Get product statistics
        const productStats = await (0, database_1.query)(`
      SELECT
        COUNT(*) as total_products,
        COUNT(*) FILTER (WHERE is_active = true) as active_products,
        COUNT(*) FILTER (WHERE stock_quantity <= low_stock_threshold AND stock_quantity > 0) as low_stock_products,
        COUNT(*) FILTER (WHERE stock_quantity = 0) as out_of_stock_products,
        SUM(stock_quantity) as total_stock_quantity
      FROM products
    `);
        // Get customer statistics
        const customerStats = await (0, database_1.query)(`
      SELECT
        COUNT(*) as total_customers,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_customers_30_days,
        AVG(total_spent) as average_customer_value
      FROM customers
    `);
        // Get recent orders
        const recentOrders = await (0, database_1.query)(`
      SELECT
        o.id,
        o.order_number,
        o.total,
        o.status,
        o.created_at,
        c.email as customer_email,
        c.first_name,
        c.last_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `);
        // Get top products
        const topProducts = await (0, database_1.query)(`
      SELECT
        p.name,
        p.sku,
        SUM(oi.quantity) as total_sold,
        SUM(oi.total) as total_revenue
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'delivered'
      GROUP BY p.id, p.name, p.sku
      ORDER BY total_sold DESC
      LIMIT 10
    `);
        // Get sales by date (last 30 days)
        const salesByDate = await (0, database_1.query)(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as orders_count,
        SUM(total) as revenue
      FROM orders
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND status = 'delivered'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);
        res.json({
            success: true,
            data: {
                overview: {
                    orders: {
                        total: parseInt(orderStats.rows[0].total_orders),
                        completed: parseInt(orderStats.rows[0].completed_orders),
                        pending: parseInt(orderStats.rows[0].pending_orders),
                        paid: parseInt(orderStats.rows[0].paid_orders),
                        revenue30Days: parseFloat(orderStats.rows[0].revenue_30_days),
                        totalRevenue: parseFloat(orderStats.rows[0].total_revenue),
                        averageOrderValue: parseFloat(orderStats.rows[0].average_order_value) || 0
                    },
                    products: {
                        total: parseInt(productStats.rows[0].total_products),
                        active: parseInt(productStats.rows[0].active_products),
                        lowStock: parseInt(productStats.rows[0].low_stock_products),
                        outOfStock: parseInt(productStats.rows[0].out_of_stock_products),
                        totalStock: parseInt(productStats.rows[0].total_stock_quantity) || 0
                    },
                    customers: {
                        total: parseInt(customerStats.rows[0].total_customers),
                        new30Days: parseInt(customerStats.rows[0].new_customers_30_days),
                        averageValue: parseFloat(customerStats.rows[0].average_customer_value) || 0
                    }
                },
                recentOrders: recentOrders.rows,
                topProducts: topProducts.rows,
                salesByDate: salesByDate.rows
            }
        });
    }
    catch (error) {
        console.error('Get dashboard overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get dashboard overview'
        });
    }
});
// Get sales analytics with date range
router.get('/sales', [
    auth_1.authenticateToken,
    auth_1.requireManager,
    (0, express_validator_1.query)('startDate').optional().isISO8601(),
    (0, express_validator_1.query)('endDate').optional().isISO8601(),
    (0, express_validator_1.query)('groupBy').optional().isIn(['day', 'week', 'month'])
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
        const { startDate, endDate, groupBy = 'day' } = req.query;
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const end = endDate || new Date().toISOString().split('T')[0];
        let dateGroup;
        switch (groupBy) {
            case 'week':
                dateGroup = "DATE_TRUNC('week', created_at)";
                break;
            case 'month':
                dateGroup = "DATE_TRUNC('month', created_at)";
                break;
            default:
                dateGroup = "DATE(created_at)";
        }
        const salesQuery = `
      SELECT
        ${dateGroup} as period,
        COUNT(*) as orders_count,
        SUM(total) as revenue,
        AVG(total) as average_order_value,
        COUNT(DISTINCT customer_id) as unique_customers
      FROM orders
      WHERE created_at >= $1::date
        AND created_at <= $2::date
        AND status = 'delivered'
      GROUP BY ${dateGroup}
      ORDER BY period
    `;
        const salesResult = await (0, database_1.query)(salesQuery, [start, end]);
        // Get product performance
        const productPerformance = await (0, database_1.query)(`
      SELECT
        p.name,
        p.sku,
        SUM(oi.quantity) as quantity_sold,
        SUM(oi.total) as revenue,
        COUNT(DISTINCT oi.order_id) as orders_count
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at >= $1::date
        AND o.created_at <= $2::date
        AND o.status = 'delivered'
      GROUP BY p.id, p.name, p.sku
      ORDER BY revenue DESC
      LIMIT 20
    `, [start, end]);
        // Get category performance
        const categoryPerformance = await (0, database_1.query)(`
      SELECT
        c.name as category_name,
        COUNT(DISTINCT p.id) as products_count,
        SUM(oi.quantity) as quantity_sold,
        SUM(oi.total) as revenue
      FROM categories c
      JOIN product_categories pc ON c.id = pc.category_id
      JOIN products p ON pc.product_id = p.id
      JOIN order_items oi ON p.id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at >= $1::date
        AND o.created_at <= $2::date
        AND o.status = 'delivered'
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
    `, [start, end]);
        res.json({
            success: true,
            data: {
                period: { start, end, groupBy },
                sales: salesResult.rows,
                productPerformance: productPerformance.rows,
                categoryPerformance: categoryPerformance.rows
            }
        });
    }
    catch (error) {
        console.error('Get sales analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get sales analytics'
        });
    }
});
// Get customer analytics
router.get('/customers', [
    auth_1.authenticateToken,
    auth_1.requireManager,
    (0, express_validator_1.query)('period').optional().isIn(['7d', '30d', '90d', '1y'])
], async (req, res) => {
    try {
        const period = req.query.period || '30d';
        let days;
        switch (period) {
            case '7d':
                days = 7;
                break;
            case '90d':
                days = 90;
                break;
            case '1y':
                days = 365;
                break;
            default: days = 30;
        }
        // Customer acquisition
        const customerAcquisition = await (0, database_1.query)(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as new_customers
      FROM customers
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `);
        // Customer lifetime value
        const customerValue = await (0, database_1.query)(`
      SELECT
        CASE
          WHEN total_spent >= 1000 THEN 'High Value'
          WHEN total_spent >= 500 THEN 'Medium Value'
          WHEN total_spent >= 100 THEN 'Low Value'
          ELSE 'New Customer'
        END as value_segment,
        COUNT(*) as customer_count,
        AVG(total_spent) as average_spent,
        SUM(total_spent) as total_spent
      FROM customers
      GROUP BY value_segment
      ORDER BY total_spent DESC
    `);
        // Repeat customers
        const repeatCustomers = await (0, database_1.query)(`
      SELECT
        COUNT(*) FILTER (WHERE total_orders > 1) as repeat_customers,
        COUNT(*) FILTER (WHERE total_orders = 1) as one_time_customers,
        COUNT(*) as total_customers
      FROM customers
    `);
        res.json({
            success: true,
            data: {
                period,
                customerAcquisition: customerAcquisition.rows,
                customerValue: customerValue.rows,
                repeatCustomers: repeatCustomers.rows[0]
            }
        });
    }
    catch (error) {
        console.error('Get customer analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get customer analytics'
        });
    }
});
// Get inventory analytics
router.get('/inventory', [
    auth_1.authenticateToken,
    auth_1.requireManager
], async (req, res) => {
    try {
        // Stock levels
        const stockLevels = await (0, database_1.query)(`
      SELECT
        COUNT(*) FILTER (WHERE stock_quantity = 0) as out_of_stock,
        COUNT(*) FILTER (WHERE stock_quantity > 0 AND stock_quantity <= low_stock_threshold) as low_stock,
        COUNT(*) FILTER (WHERE stock_quantity > low_stock_threshold) as in_stock,
        SUM(stock_quantity) as total_stock_value
      FROM products
      WHERE is_active = true
    `);
        // Inventory turnover
        const inventoryTurnover = await (0, database_1.query)(`
      SELECT
        p.name,
        p.sku,
        p.stock_quantity,
        COALESCE(SUM(oi.quantity), 0) as sold_last_30_days,
        CASE
          WHEN p.stock_quantity > 0 THEN ROUND(COALESCE(SUM(oi.quantity), 0) * 30.0 / p.stock_quantity, 2)
          ELSE 0
        END as turnover_rate
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'
      WHERE p.is_active = true
      GROUP BY p.id, p.name, p.sku, p.stock_quantity
      ORDER BY turnover_rate DESC
      LIMIT 20
    `);
        // Stock alerts
        const stockAlerts = await (0, database_1.query)(`
      SELECT
        name,
        sku,
        stock_quantity,
        low_stock_threshold,
        CASE
          WHEN stock_quantity = 0 THEN 'Out of Stock'
          WHEN stock_quantity <= low_stock_threshold THEN 'Low Stock'
          ELSE 'Normal'
        END as alert_level
      FROM products
      WHERE is_active = true
        AND (stock_quantity = 0 OR stock_quantity <= low_stock_threshold)
      ORDER BY stock_quantity ASC
      LIMIT 20
    `);
        res.json({
            success: true,
            data: {
                stockLevels: stockLevels.rows[0],
                inventoryTurnover: inventoryTurnover.rows,
                stockAlerts: stockAlerts.rows
            }
        });
    }
    catch (error) {
        console.error('Get inventory analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get inventory analytics'
        });
    }
});
// Track user activity
router.post('/activity', [
    auth_1.authenticateToken,
    auth_1.requireManager
], async (req, res) => {
    try {
        const { eventType, eventData } = req.body;
        await (0, database_1.query)(`
      INSERT INTO analytics_events (event_type, event_data, user_id, session_id)
      VALUES ($1, $2, $3, $4)
    `, [eventType, eventData, req.user.id, 'unknown']);
        res.json({
            success: true,
            message: 'Activity tracked successfully'
        });
    }
    catch (error) {
        console.error('Track activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to track activity'
        });
    }
});
exports.default = router;
//# sourceMappingURL=analytics.js.map