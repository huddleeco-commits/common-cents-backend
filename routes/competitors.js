/**
 * Competitors API Routes
 * Admin endpoints for competitor intelligence
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticateToken, isAdmin } = require('../modules/auth/middleware/auth');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET /api/competitors - List all competitors
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { limit = 20, offset = 0, threat_level } = req.query;

    let query = 'SELECT * FROM competitors';
    const params = [];

    if (threat_level) {
      query += ' WHERE threat_level = $1';
      params.push(threat_level);
    }

    query += ' ORDER BY distance ASC NULLS LAST';
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM competitors';
    if (threat_level) {
      countQuery += ' WHERE threat_level = $1';
    }
    const countResult = await pool.query(countQuery, threat_level ? [threat_level] : []);

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching competitors:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/competitors/summary - Get competitor landscape summary
router.get('/summary', authenticateToken, isAdmin, async (req, res) => {
  try {
    const summary = await pool.query(`
      SELECT
        COUNT(*) as total_competitors,
        COUNT(CASE WHEN threat_level = 'high' THEN 1 END) as high_threat,
        COUNT(CASE WHEN threat_level = 'medium' THEN 1 END) as medium_threat,
        COUNT(CASE WHEN threat_level = 'low' THEN 1 END) as low_threat,
        COALESCE(AVG(rating), 0) as avg_competitor_rating,
        COALESCE(AVG(avg_price), 0) as avg_competitor_price,
        COALESCE(MIN(distance), 0) as nearest_competitor
      FROM competitors
    `);

    res.json({ success: true, data: summary.rows[0] });
  } catch (error) {
    console.error('Error fetching competitor summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/competitors/:id - Get single competitor
router.get('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM competitors WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Competitor not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching competitor:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/competitors - Create competitor
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const {
      name, website, distance, type, threat_level, rating, rating_change,
      review_count, avg_price, price_diff, strengths, weaknesses, top_items, sentiment, notes
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Competitor name is required' });
    }

    const result = await pool.query(
      `INSERT INTO competitors (
        name, website, distance, type, threat_level, rating, rating_change,
        review_count, avg_price, price_diff, strengths, weaknesses, top_items, sentiment, notes,
        created_at, updated_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
       RETURNING *`,
      [name, website, distance, type || 'Direct Competitor', threat_level || 'medium',
       rating, rating_change || 0, review_count || 0, avg_price, price_diff || 0,
       strengths, weaknesses, JSON.stringify(top_items), JSON.stringify(sentiment), notes]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating competitor:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/competitors/:id - Update competitor
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, website, distance, type, threat_level, rating, rating_change,
      review_count, avg_price, price_diff, strengths, weaknesses, top_items, sentiment, notes
    } = req.body;

    const result = await pool.query(
      `UPDATE competitors
       SET name = COALESCE($1, name),
           website = COALESCE($2, website),
           distance = COALESCE($3, distance),
           type = COALESCE($4, type),
           threat_level = COALESCE($5, threat_level),
           rating = COALESCE($6, rating),
           rating_change = COALESCE($7, rating_change),
           review_count = COALESCE($8, review_count),
           avg_price = COALESCE($9, avg_price),
           price_diff = COALESCE($10, price_diff),
           strengths = COALESCE($11, strengths),
           weaknesses = COALESCE($12, weaknesses),
           top_items = COALESCE($13, top_items),
           sentiment = COALESCE($14, sentiment),
           notes = COALESCE($15, notes),
           updated_at = NOW()
       WHERE id = $16
       RETURNING *`,
      [name, website, distance, type, threat_level, rating, rating_change,
       review_count, avg_price, price_diff, strengths, weaknesses,
       top_items ? JSON.stringify(top_items) : null,
       sentiment ? JSON.stringify(sentiment) : null, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Competitor not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating competitor:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/competitors/:id - Delete competitor
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM competitors WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Competitor not found' });
    }

    res.json({ success: true, message: 'Competitor deleted' });
  } catch (error) {
    console.error('Error deleting competitor:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
