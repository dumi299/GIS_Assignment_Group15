import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Save mitigation area (drawn geometry)
router.post('/', async (req, res) => {
  try {
    const {
      project_id,
      geometry,
      area_sq_km,
      location_name,
      description,
      user_id,
    } = req.body;

    const userId = user_id || '00000000-0000-0000-0000-000000000000';

    const result = await pool.query(
      `INSERT INTO mitigation_areas (
        project_id, geometry, area_sq_km, location_name, description, user_id
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        project_id,
        JSON.stringify(geometry),
        area_sq_km,
        location_name || null,
        description || null,
        userId,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving mitigation area:', error);
    res.status(500).json({ error: 'Failed to save mitigation area' });
  }
});

// Get areas for a project
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await pool.query(
      'SELECT * FROM mitigation_areas WHERE project_id = $1 ORDER BY created_at DESC',
      [projectId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching mitigation areas:', error);
    res.status(500).json({ error: 'Failed to fetch mitigation areas' });
  }
});

// Get single area
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM mitigation_areas WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mitigation area not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching mitigation area:', error);
    res.status(500).json({ error: 'Failed to fetch mitigation area' });
  }
});

// Delete area
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM mitigation_areas WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mitigation area not found' });
    }

    res.json({ message: 'Mitigation area deleted successfully' });
  } catch (error) {
    console.error('Error deleting mitigation area:', error);
    res.status(500).json({ error: 'Failed to delete mitigation area' });
  }
});

export default router;

