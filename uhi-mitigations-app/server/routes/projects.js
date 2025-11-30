import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Get all projects
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, 
       COUNT(DISTINCT ma.id) as area_count,
       COUNT(DISTINCT sr.id) as simulation_count
       FROM projects p
       LEFT JOIN mitigation_areas ma ON p.id = ma.project_id
       LEFT JOIN simulation_results sr ON p.id = sr.project_id
       GROUP BY p.id
       ORDER BY p.updated_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get single project with all related data
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get project
    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectResult.rows[0];

    // Get mitigation areas
    const areasResult = await pool.query(
      'SELECT * FROM mitigation_areas WHERE project_id = $1 ORDER BY created_at DESC',
      [id]
    );

    // Get raster files
    const rasterResult = await pool.query(
      'SELECT * FROM raster_files WHERE project_id = $1 ORDER BY upload_date DESC',
      [id]
    );

    // Get simulations with correlation and heatmap data
    const simulationsResult = await pool.query(
      `SELECT sr.*, 
       ma.geometry as area_geometry,
       ma.area_sq_km,
       ma.location_name,
       cd.correlation_coefficient,
       cd.data_points as correlation_data_points,
       hg.geojson_data as heatmap_geojson
       FROM simulation_results sr
       LEFT JOIN mitigation_areas ma ON sr.mitigation_area_id = ma.id
       LEFT JOIN correlation_data cd ON sr.id = cd.simulation_result_id
       LEFT JOIN heatmap_geojson hg ON sr.id = hg.simulation_result_id
       WHERE sr.project_id = $1
       ORDER BY sr.timestamp DESC`,
      [id]
    );

    res.json({
      ...project,
      mitigation_areas: areasResult.rows,
      raster_files: rasterResult.rows,
      simulations: simulationsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create new project
router.post('/', async (req, res) => {
  try {
    const { name, description, user_id } = req.body;
    
    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const userId = user_id || '00000000-0000-0000-0000-000000000000';

    // First, check if users table has the default user
    try {
      const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length === 0) {
        // Create default user if it doesn't exist
        await pool.query(
          'INSERT INTO users (id, username, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
          [userId, 'default_user', 'user@example.com']
        );
      }
    } catch (userError) {
      console.error('Error checking/creating default user:', userError);
      // Continue anyway - might be a permissions issue
    }

    const result = await pool.query(
      'INSERT INTO projects (name, description, user_id) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), description ? description.trim() : null, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating project:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      detail: error.detail,
      hint: error.hint
    });
    
    // Provide more detailed error messages
    let errorMessage = 'Failed to create project';
    let statusCode = 500;
    
    if (error.code === '23505') { // Unique constraint violation
      errorMessage = 'A project with this name already exists';
      statusCode = 400;
    } else if (error.code === '23503') { // Foreign key violation
      errorMessage = 'Invalid user ID. The default user may not exist in the database.';
    } else if (error.code === '42P01') { // Table doesn't exist
      errorMessage = 'Database table not found. Please run the database schema setup (schema.sql).';
    } else if (error.code === '28P01' || error.message?.includes('password authentication failed')) {
      errorMessage = 'Database authentication failed. Please check your PostgreSQL password in the .env file.';
    } else if (error.code === '3D000' || error.message?.includes('database') && error.message?.includes('does not exist')) {
      errorMessage = 'Database does not exist. Please create the database: CREATE DATABASE uhi_mitigations;';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      errorMessage = 'Cannot connect to database. Please check your database configuration and ensure PostgreSQL is running.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      code: error.code,
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        detail: error.detail,
        hint: error.hint
      } : undefined
    });
  }
});

// Update project
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const result = await pool.query(
      'UPDATE projects SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name, description || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;

