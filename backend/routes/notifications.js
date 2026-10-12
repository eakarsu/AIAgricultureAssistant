const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all notifications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1',
      [req.user.id]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const unreadCount = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );

    res.json({
      records: result.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      unreadCount: parseInt(unreadCount.rows[0].count)
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id',authMiddleware,async(req,res)=>{try{const row=(await pool.query('SELECT * FROM notifications WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id])).rows[0];if(!row)return res.status(404).json({error:'Notification not found'});res.json({record:row});}catch(_){res.status(503).json({error:'Native notification details could not be loaded. Retry.'});}});
router.put('/:id/read-state',authMiddleware,async(req,res)=>{if(Object.keys(req.body||{}).some(key=>key!=='is_read')||typeof req.body?.is_read!=='boolean')return res.status(400).json({error:'Only the boolean native read state can be edited.'});try{const row=(await pool.query('UPDATE notifications SET is_read=$1 WHERE id=$2 AND user_id=$3 RETURNING *',[req.body.is_read,req.params.id,req.user.id])).rows[0];if(!row)return res.status(404).json({error:'Notification not found'});res.json({record:row});}catch(_){res.status(503).json({error:'Native read state could not be saved. Retry.'});}});

// Mark notification as read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ record: result.rows[0] });
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark all as read
router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all read:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete notification
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
