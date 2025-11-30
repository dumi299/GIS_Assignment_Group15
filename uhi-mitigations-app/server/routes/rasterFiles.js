import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Save raster file metadata
router.post('/', async (req, res) => {
  try {
    const { project_id, file_name, file_type, file_size, user_id } = req.body;

    const userId = user_id || '00000000-0000-0000-0000-000000000000';

    const result = await pool.query(
      `INSERT INTO raster_files (project_id, file_name, file_type, file_size, user_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [project_id, file_name, file_type, file_size, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving raster file:', error);
    res.status(500).json({ error: 'Failed to save raster file metadata' });
  }
});

// Get raster files for a project
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await pool.query(
      'SELECT * FROM raster_files WHERE project_id = $1 ORDER BY upload_date DESC',
      [projectId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching raster files:', error);
    res.status(500).json({ error: 'Failed to fetch raster files' });
  }
});

export default router;

