-- PostgreSQL Database Schema for UHI Mitigations App

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (for future authentication)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mitigation Areas (Drawn Geometries)
CREATE TABLE IF NOT EXISTS mitigation_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    geometry JSONB NOT NULL,
    area_sq_km DECIMAL(10, 2) NOT NULL,
    location_name VARCHAR(255),
    description TEXT,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Simulation Results
CREATE TABLE IF NOT EXISTS simulation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    mitigation_area_id UUID REFERENCES mitigation_areas(id) ON DELETE CASCADE,
    selected_indices TEXT[] NOT NULL,
    cooling_capacity_html TEXT,
    predicted_temp_reduction DECIMAL(5, 2),
    simulated_ndvi_value DECIMAL(5, 3),
    water_savings_estimate DECIMAL(10, 2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Correlation Data
CREATE TABLE IF NOT EXISTS correlation_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulation_result_id UUID REFERENCES simulation_results(id) ON DELETE CASCADE,
    correlation_coefficient DECIMAL(5, 3),
    data_points JSONB NOT NULL, -- Array of {x, y} points
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Heatmap GeoJSON
CREATE TABLE IF NOT EXISTS heatmap_geojson (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulation_result_id UUID REFERENCES simulation_results(id) ON DELETE CASCADE,
    geojson_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Uploaded Raster Files Metadata
CREATE TABLE IF NOT EXISTS raster_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- 'lst', 'ndvi', 'ndbi', 'lulc'
    file_size BIGINT NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_mitigation_areas_project_id ON mitigation_areas(project_id);
CREATE INDEX IF NOT EXISTS idx_simulation_results_project_id ON simulation_results(project_id);
CREATE INDEX IF NOT EXISTS idx_simulation_results_mitigation_area_id ON simulation_results(mitigation_area_id);
CREATE INDEX IF NOT EXISTS idx_correlation_data_simulation_result_id ON correlation_data(simulation_result_id);
CREATE INDEX IF NOT EXISTS idx_heatmap_geojson_simulation_result_id ON heatmap_geojson(simulation_result_id);
CREATE INDEX IF NOT EXISTS idx_raster_files_project_id ON raster_files(project_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

