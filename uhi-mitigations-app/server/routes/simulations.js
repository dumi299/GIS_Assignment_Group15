import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Save simulation result
router.post('/', async (req, res) => {
  try {
    const {
      project_id,
      mitigation_area_id,
      selected_indices,
      cooling_capacity_html,
      predicted_temp_reduction,
      simulated_ndvi_value,
      water_savings_estimate,
      correlation_data_points,
      correlation_coefficient,
      heatmap_geojson,
    } = req.body;

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert simulation result
      const simResult = await client.query(
        `INSERT INTO simulation_results (
          project_id, mitigation_area_id, selected_indices, cooling_capacity_html,
          predicted_temp_reduction, simulated_ndvi_value, water_savings_estimate
        ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          project_id,
          mitigation_area_id,
          selected_indices,
          cooling_capacity_html,
          predicted_temp_reduction || null,
          simulated_ndvi_value || null,
          water_savings_estimate || null,
        ]
      );

      const simulationId = simResult.rows[0].id;

      // Insert correlation data if provided
      if (correlation_data_points && correlation_data_points.length > 0) {
        await client.query(
          `INSERT INTO correlation_data (simulation_result_id, correlation_coefficient, data_points)
           VALUES ($1, $2, $3)`,
          [simulationId, correlation_coefficient || null, JSON.stringify(correlation_data_points)]
        );
      }

      // Insert heatmap GeoJSON if provided
      if (heatmap_geojson) {
        await client.query(
          `INSERT INTO heatmap_geojson (simulation_result_id, geojson_data)
           VALUES ($1, $2)`,
          [simulationId, JSON.stringify(heatmap_geojson)]
        );
      }

      await client.query('COMMIT');

      // Fetch complete simulation data
      const completeResult = await client.query(
        `SELECT sr.*, 
         cd.correlation_coefficient,
         cd.data_points as correlation_data_points,
         hg.geojson_data as heatmap_geojson
         FROM simulation_results sr
         LEFT JOIN correlation_data cd ON sr.id = cd.simulation_result_id
         LEFT JOIN heatmap_geojson hg ON sr.id = hg.simulation_result_id
         WHERE sr.id = $1`,
        [simulationId]
      );

      res.status(201).json(completeResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error saving simulation:', error);
    res.status(500).json({ error: 'Failed to save simulation' });
  }
});

// Get simulation by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT sr.*, 
       cd.correlation_coefficient,
       cd.data_points as correlation_data_points,
       hg.geojson_data as heatmap_geojson,
       ma.geometry as area_geometry,
       ma.area_sq_km,
       ma.location_name
       FROM simulation_results sr
       LEFT JOIN correlation_data cd ON sr.id = cd.simulation_result_id
       LEFT JOIN heatmap_geojson hg ON sr.id = hg.simulation_result_id
       LEFT JOIN mitigation_areas ma ON sr.mitigation_area_id = ma.id
       WHERE sr.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Simulation not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching simulation:', error);
    res.status(500).json({ error: 'Failed to fetch simulation' });
  }
});

export default router;

