/**
 * Orders API Routes
 * Admin endpoints for order management
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticateToken, isAdmin } = require('../modules/auth/middleware/auth');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Generate order number
function generateOrderNumber() {
  const prefix = 'ORD';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// GET /api/orders - List all orders
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0, status, payment_status, search } = req.query;

    let query = `
      SELECT o.*, c.name as customer_name, c.email as customer_email
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
    `;
    const params = [];
    const conditions = [];

    if (search) {
      conditions.push(`(o.order_number ILIKE $${params.length + 1} OR c.name ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }

    if (status) {
      conditions.push(`o.status = $${params.length + 1}`);
      params.push(status);
    }

    if (payment_status) {
      conditions.push(`o.payment_status = $${params.length + 1}`);
      params.push(payment_status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY o.created_at DESC';
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM orders o LEFT JOIN customers c ON o.customer_id = c.id';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    const countResult = await pool.query(countQuery, params.slice(0, -2));

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/orders/stats - Get order statistics
router.get('/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(AVG(total), 0) as avg_order_value,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as orders_today,
        COALESCE(SUM(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN total END), 0) as revenue_today
      FROM orders
    `);

    res.json({ success: true, data: stats.rows[0] });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/orders/:id - Get single order with items
router.get('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const orderResult = await pool.query(`
      SELECT o.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.id = $1
    `, [id]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const itemsResult = await pool.query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...orderResult.rows[0],
        items: itemsResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/orders - Create order
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { customer_id, items, notes, shipping_address, payment_method } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Order must have at least one item' });
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
      subtotal += item.quantity * item.unit_price;
    }
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + tax;

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (customer_id, order_number, subtotal, tax, total, notes, shipping_address, payment_method, status, payment_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', 'unpaid', NOW(), NOW())
       RETURNING *`,
      [customer_id, generateOrderNumber(), subtotal, tax, total, notes, shipping_address, payment_method]
    );

    const order = orderResult.rows[0];

    // Create order items
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [order.id, item.product_id, item.product_name, item.quantity, item.unit_price, item.quantity * item.unit_price]
      );
    }

    // Update customer stats if customer exists
    if (customer_id) {
      await client.query(
        `UPDATE customers
         SET order_count = order_count + 1,
             total_spent = total_spent + $1,
             updated_at = NOW()
         WHERE id = $2`,
        [total, customer_id]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// PUT /api/orders/:id - Update order status
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, payment_status, notes } = req.body;

    const result = await pool.query(
      `UPDATE orders
       SET status = COALESCE($1, status),
           payment_status = COALESCE($2, payment_status),
           notes = COALESCE($3, notes),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, payment_status, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/orders/:id - Delete order
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Order items are deleted via CASCADE
    const result = await pool.query('DELETE FROM orders WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({ success: true, message: 'Order deleted' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
