const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.csv', '.xlsx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
});

// Get all uploads
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM uploaded_files WHERE user_id = $1',
      [req.user.id]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT * FROM uploaded_files WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({
      records: result.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching uploads:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/file',authMiddleware,async(req,res)=>{try{const row=(await pool.query('SELECT filename,original_name FROM uploaded_files WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id])).rows[0];if(!row)return res.status(404).json({error:'File not found'});const filename=path.basename(row.filename);if(filename!==row.filename)return res.status(409).json({error:'Stored file identity is invalid; no file was served.'});const target=path.join(uploadsDir,filename);if(!fs.existsSync(target))return res.status(404).json({error:'The actual stored file is unavailable. Metadata was retained; no replacement file was fabricated.'});res.download(target,row.original_name,error=>{if(error&&!res.headersSent)res.status(503).json({error:'The actual file could not be downloaded. Retry.'});});}catch(error){res.status(503).json({error:'The actual file could not be loaded. Retry.'});}});

router.get('/:id',authMiddleware,async(req,res)=>{try{const row=(await pool.query('SELECT * FROM uploaded_files WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id])).rows[0];if(!row)return res.status(404).json({error:'File not found'});res.json({record:row});}catch(_){res.status(503).json({error:'Native file details could not be loaded. Retry.'});}});
router.put('/:id',authMiddleware,async(req,res)=>{const body=req.body||{};if(Object.keys(body).some(key=>!['category','description'].includes(key))||typeof body.category!=='string'||body.category.length>50||typeof body.description!=='string'||body.description.length>4000)return res.status(400).json({error:'Only text category and description may be edited; the actual file identity is retained.'});try{const row=(await pool.query('UPDATE uploaded_files SET category=$1,description=$2 WHERE id=$3 AND user_id=$4 RETURNING *',[body.category,body.description,req.params.id,req.user.id])).rows[0];if(!row)return res.status(404).json({error:'File not found'});res.json({record:row});}catch(_){res.status(503).json({error:'Native file metadata could not be saved. Retry.'});}});

// Upload file
router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { category, description } = req.body;

    const result = await pool.query(
      `INSERT INTO uploaded_files (user_id, filename, original_name, mime_type, file_size, file_path, category, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        req.user.id,
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        `/uploads/${req.file.filename}`,
        category || 'general',
        description || ''
      ]
    );

    res.status(201).json({ record: result.rows[0] });
  } catch (error) {
    if(req.file?.path)try{fs.unlinkSync(req.file.path);}catch(_){}
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete upload
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM uploaded_files WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Remove physical file
    const filePath = path.join(uploadsDir, result.rows[0].filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ message: 'File deleted', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting upload:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
