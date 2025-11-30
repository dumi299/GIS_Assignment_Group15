import type { LatLngBounds } from 'leaflet';

export type IndexType = 'lst' | 'ndvi' | 'ndbi' | 'lulc';

export type BasemapType = 'esri_satellite' | 'osm' | 'topo' | 'light' | 'esri_streets' | 'esri_gray';

export type TabType = 'mitigation' | 'layers' | 'basemaps' | 'projects';

export interface CorrelationDataPoint {
  x: number;
  y: number;
}

export interface HeatmapFeature {
  type: "Feature";
  properties: {
    r_value: number;
    color: string;
  };
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

export interface HeatmapGeoJson {
  type: "FeatureCollection";
  features: HeatmapFeature[];
}

export interface VisualizationResult {
  html: string;
  correlationData: CorrelationDataPoint[];
  heatmapGeoJson: HeatmapGeoJson | null;
}

export interface UploadedRasterFile {
  name: string;
  file: File;
}

// Database types
export interface Project {
  id: string;
  name: string;
  description?: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
  area_count?: number;
  simulation_count?: number;
  mitigation_areas?: MitigationArea[];
  raster_files?: RasterFile[];
  simulations?: SimulationResult[];
}

export interface MitigationArea {
  id: string;
  project_id: string;
  geometry: GeoJSON.GeoJSON;
  area_sq_km: number;
  location_name?: string;
  description?: string;
  user_id?: string;
  created_at: string;
}

export interface SimulationResult {
  id: string;
  project_id: string;
  mitigation_area_id: string;
  selected_indices: string[];
  cooling_capacity_html?: string;
  predicted_temp_reduction?: number;
  simulated_ndvi_value?: number;
  water_savings_estimate?: number;
  timestamp: string;
  correlation_coefficient?: number;
  correlation_data_points?: CorrelationDataPoint[];
  heatmap_geojson?: HeatmapGeoJson;
  area_geometry?: GeoJSON.GeoJSON;
  area_sq_km?: number;
  location_name?: string;
}

export interface RasterFile {
  id: string;
  project_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  user_id?: string;
}
