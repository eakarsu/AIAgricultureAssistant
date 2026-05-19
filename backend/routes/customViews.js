// Custom Views routes — supplies data for FieldMap, CropYieldChart, PlantingPlanPDF, IrrigationScheduler
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const PDFDocument = require('pdfkit');

// Ensure irrigation_schedules table exists (idempotent)
async function ensureIrrigationSchedulesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS irrigation_schedules (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        zone VARCHAR(255) NOT NULL,
        start_time TIMESTAMP NOT NULL,
        duration_minutes INTEGER NOT NULL,
        recurrence VARCHAR(50) DEFAULT 'once',
        status VARCHAR(50) DEFAULT 'scheduled',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (e) {
    console.warn('[customViews] ensure irrigation_schedules table failed:', e.message);
  }
}
ensureIrrigationSchedulesTable();

router.use(authMiddleware);

// -------------------------------------------------------------------
// GET /api/custom-views/fields-geo  — FieldMap polygons
// Returns synthesized small polygons around each field's lat/lng,
// colored by crop_type (with a fallback to soil moisture heuristic).
// -------------------------------------------------------------------
router.get('/fields-geo', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, latitude, longitude, area_size, area_unit, crop_type, soil_type, color
       FROM field_locations
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 200`,
      [req.user.id]
    );

    const cropPalette = {
      corn: '#fbc02d', wheat: '#c0a96b', soybean: '#43a047',
      rice: '#26a69a', cotton: '#e0e0e0', barley: '#a1887f',
      potato: '#8d6e63', tomato: '#e53935', alfalfa: '#7cb342'
    };

    const features = result.rows.map((r) => {
      const lat = parseFloat(r.latitude);
      const lng = parseFloat(r.longitude);
      // Approx polygon: square ~ proportional to area_size (acres → ~0.005 deg per acre baseline)
      const acres = parseFloat(r.area_size) || 10;
      const span = Math.min(0.05, Math.max(0.003, Math.sqrt(acres) * 0.0015));
      const ring = [
        [lat - span, lng - span],
        [lat - span, lng + span],
        [lat + span, lng + span],
        [lat + span, lng - span],
        [lat - span, lng - span]
      ];
      const cropKey = (r.crop_type || '').toLowerCase().trim();
      const color = r.color || cropPalette[cropKey] || '#2e7d32';
      // Soil-moisture heuristic by soil type for an alternate fill
      const moistureByType = { clay: 0.62, loam: 0.45, sand: 0.22, silt: 0.5 };
      const soilKey = (r.soil_type || '').toLowerCase().trim();
      const soilMoisture = moistureByType[soilKey] ?? 0.4;

      return {
        id: r.id,
        name: r.name,
        crop_type: r.crop_type,
        soil_type: r.soil_type,
        area_size: r.area_size,
        area_unit: r.area_unit,
        color,
        soil_moisture: soilMoisture,
        center: [lat, lng],
        polygon: ring
      };
    });

    res.json({ records: features });
  } catch (err) {
    console.error('[customViews] fields-geo error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------------------------------------------------------
// GET /api/custom-views/yield-trends — CropYieldChart series
// Returns yield per field across seasons (synthesized from
// harvest_predictions, grouping by field_name + year).
// -------------------------------------------------------------------
router.get('/yield-trends', async (req, res) => {
  try {
    const rs = await pool.query(
      `SELECT field_name, crop_type, predicted_yield, yield_unit,
              COALESCE(expected_harvest_date, planting_date, created_at) AS season_date
       FROM harvest_predictions
       WHERE user_id = $1 AND status != 'deleted'
       ORDER BY season_date ASC`,
      [req.user.id]
    );

    // Pivot: { season: '2024 Spring', <fieldName>: yield, ... }
    const seasonOrder = [];
    const seasonMap = {};
    const fieldSet = new Set();

    function seasonLabel(d) {
      const dt = new Date(d);
      const m = dt.getMonth();
      const y = dt.getFullYear();
      const tag = m < 3 ? 'Winter' : m < 6 ? 'Spring' : m < 9 ? 'Summer' : 'Fall';
      return `${y} ${tag}`;
    }

    for (const row of rs.rows) {
      const label = seasonLabel(row.season_date);
      if (!seasonMap[label]) {
        seasonMap[label] = { season: label };
        seasonOrder.push(label);
      }
      const yieldVal = parseFloat(row.predicted_yield) || 0;
      // If multiple entries per season per field, take the highest predicted_yield
      const prev = seasonMap[label][row.field_name];
      seasonMap[label][row.field_name] = prev != null ? Math.max(prev, yieldVal) : yieldVal;
      fieldSet.add(row.field_name);
    }

    res.json({
      seasons: seasonOrder.map((s) => seasonMap[s]),
      fields: Array.from(fieldSet)
    });
  } catch (err) {
    console.error('[customViews] yield-trends error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// -------------------------------------------------------------------
// POST /api/custom-views/planting-plan-pdf — PlantingPlanPDF
// Body: { field_name, crop_type, planting_date?, area?, area_unit?, seed_rate?, fertilizer_schedule? }
// Returns: application/pdf
// -------------------------------------------------------------------
router.post('/planting-plan-pdf', async (req, res) => {
  try {
    const {
      field_name = 'Unnamed Field',
      crop_type = 'Unspecified Crop',
      planting_date = null,
      area = null,
      area_unit = 'acres',
      seed_rate = null,
      fertilizer_schedule = null,
      notes = null
    } = req.body || {};

    // Build a calendar of typical events spanning ~120 days from planting
    const startDate = planting_date ? new Date(planting_date) : new Date();
    const fmt = (d) => d.toISOString().slice(0, 10);
    const addDays = (d, n) => {
      const c = new Date(d);
      c.setDate(c.getDate() + n);
      return c;
    };

    const events = [
      { day: 0, label: 'Planting / Seeding', detail: `Seed ${crop_type} at recommended rate.` },
      { day: 7, label: 'Germination check', detail: 'Confirm emergence; replant gaps if needed.' },
      { day: 21, label: 'First fertilizer pass', detail: 'Apply starter fertilizer per soil test.' },
      { day: 35, label: 'Pest scouting', detail: 'Walk field; check for early-season pests.' },
      { day: 55, label: 'Mid-season fertilizer', detail: 'Side-dress nitrogen if foliage indicates need.' },
      { day: 75, label: 'Irrigation peak window', detail: 'Maintain soil moisture above target.' },
      { day: 100, label: 'Pre-harvest scouting', detail: 'Assess maturity and disease pressure.' },
      { day: 120, label: 'Expected harvest window opens', detail: 'Begin harvest readiness checks.' }
    ];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="planting_plan_${field_name.replace(/[^a-z0-9]/gi, '_')}.pdf"`
    );

    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    doc.pipe(res);

    doc.fontSize(20).fillColor('#2e7d32').text('AI Agriculture Assistant', { align: 'left' });
    doc.fontSize(16).fillColor('#333').text('Planting Plan', { align: 'left' });
    doc.moveDown(0.5);
    doc.strokeColor('#2e7d32').lineWidth(1).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(11).fillColor('#000');
    doc.text(`Field: ${field_name}`);
    doc.text(`Crop: ${crop_type}`);
    if (area) doc.text(`Area: ${area} ${area_unit}`);
    doc.text(`Planting date: ${fmt(startDate)}`);
    if (seed_rate) doc.text(`Seed rate: ${seed_rate}`);
    if (fertilizer_schedule) doc.text(`Fertilizer schedule: ${fertilizer_schedule}`);
    doc.text(`Generated: ${new Date().toISOString()}`);
    doc.moveDown(1);

    doc.fontSize(13).fillColor('#2e7d32').text('Planting Calendar', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#000');
    for (const ev of events) {
      const when = fmt(addDays(startDate, ev.day));
      doc.font('Helvetica-Bold').text(`${when}  -  ${ev.label}`, { continued: false });
      doc.font('Helvetica').fillColor('#444').text(`    ${ev.detail}`);
      doc.fillColor('#000');
      doc.moveDown(0.3);
    }

    doc.moveDown(0.8);
    doc.fontSize(13).fillColor('#2e7d32').text('Seed Rate Reference', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#000').text(
      seed_rate
        ? `Specified: ${seed_rate}`
        : `Suggested baseline for ${crop_type}: consult local extension; typical range 20–35k seeds/acre for row crops.`
    );

    doc.moveDown(0.8);
    doc.fontSize(13).fillColor('#2e7d32').text('Fertilizer Schedule', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#000').text(
      fertilizer_schedule
        ? fertilizer_schedule
        : 'Pre-plant: balanced NPK based on soil test.\nDay 21: starter fertilizer.\nDay 55: side-dress nitrogen.\nPost-harvest: cover crop / soil amendment as needed.'
    );

    if (notes) {
      doc.moveDown(0.8);
      doc.fontSize(13).fillColor('#2e7d32').text('Notes', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#000').text(notes);
    }

    doc.end();
  } catch (err) {
    console.error('[customViews] planting-plan-pdf error', err);
    if (!res.headersSent) res.status(500).json({ error: 'Server error' });
  }
});

// -------------------------------------------------------------------
// POST /api/custom-views/irrigation-schedules — IrrigationScheduler
// Body: { zone, start_time, duration_minutes, recurrence }
// -------------------------------------------------------------------
router.post('/irrigation-schedules', async (req, res) => {
  try {
    const { zone, start_time, duration_minutes, recurrence } = req.body || {};

    if (!zone || !String(zone).trim()) return res.status(400).json({ error: 'zone is required' });
    if (!start_time) return res.status(400).json({ error: 'start_time is required' });
    const dur = parseInt(duration_minutes, 10);
    if (!dur || dur <= 0 || dur > 24 * 60) {
      return res.status(400).json({ error: 'duration_minutes must be 1..1440' });
    }
    const allowedRec = ['once', 'daily', 'weekly', 'biweekly', 'monthly'];
    const rec = recurrence && allowedRec.includes(recurrence) ? recurrence : 'once';
    const startDate = new Date(start_time);
    if (isNaN(startDate.getTime())) return res.status(400).json({ error: 'start_time must be a valid datetime' });

    const inserted = await pool.query(
      `INSERT INTO irrigation_schedules (user_id, zone, start_time, duration_minutes, recurrence)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, String(zone).trim(), startDate, dur, rec]
    );

    res.status(201).json({ record: inserted.rows[0] });
  } catch (err) {
    console.error('[customViews] irrigation-schedules error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/irrigation-schedules', async (req, res) => {
  try {
    const rs = await pool.query(
      `SELECT * FROM irrigation_schedules WHERE user_id = $1 ORDER BY start_time DESC LIMIT 200`,
      [req.user.id]
    );
    res.json({ records: rs.rows });
  } catch (err) {
    console.error('[customViews] list irrigation-schedules error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
