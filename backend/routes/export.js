const express = require('express');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { Parser } = require('json2csv');

const router = express.Router();

const tableMap = {
  'crop-diseases': { table: 'crop_diseases', name: 'crop_diseases' },
  'irrigation': { table: 'irrigation_records', name: 'irrigation_records' },
  'harvest': { table: 'harvest_predictions', name: 'harvest_predictions' },
  'pests': { table: 'pest_identifications', name: 'pest_identifications' },
  'soil': { table: 'soil_analyses', name: 'soil_analyses' }
};

// Export data as CSV or JSON
router.get('/:type/:format', authMiddleware, async (req, res) => {
  try {
    const { type, format } = req.params;

    const tableInfo = tableMap[type];
    if (!tableInfo) {
      return res.status(400).json({ error: 'Invalid export type. Valid: crop-diseases, irrigation, harvest, pests, soil' });
    }

    if (!['csv', 'json'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Valid: csv, json' });
    }

    const result = await pool.query(
      `SELECT * FROM ${tableInfo.table} WHERE user_id = $1 AND status != 'deleted' ORDER BY created_at DESC`,
      [req.user.id]
    );

    const records = result.rows;

    if (format === 'json') {
      res.setHeader('Content-Disposition', `attachment; filename=${tableInfo.name}_export.json`);
      res.setHeader('Content-Type', 'application/json');
      return res.json({ records, exported_at: new Date().toISOString(), count: records.length });
    }

    if (format === 'csv') {
      if (records.length === 0) {
        res.setHeader('Content-Disposition', `attachment; filename=${tableInfo.name}_export.csv`);
        res.setHeader('Content-Type', 'text/csv');
        return res.send('No records to export');
      }

      const fields = Object.keys(records[0]);
      const parser = new Parser({ fields });
      const csv = parser.parse(records);

      res.setHeader('Content-Disposition', `attachment; filename=${tableInfo.name}_export.csv`);
      res.setHeader('Content-Type', 'text/csv');
      return res.send(csv);
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
