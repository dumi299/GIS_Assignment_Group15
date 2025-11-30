import L from 'leaflet';
import type { IndexType, VisualizationResult, HeatmapGeoJson, CorrelationDataPoint, Project, MitigationArea, SimulationResult, RasterFile } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Helper function for API calls
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        // If response is not JSON, try to get text
        try {
          const text = await response.text();
          if (text) errorMessage = text;
        } catch (e2) {
          // Keep default error message
        }
      }
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    // Handle network errors (backend not running, CORS, etc.)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Cannot connect to backend server. Make sure the server is running on ${API_BASE_URL.replace('/api', '')}`);
    }
    throw error;
  }
};

// Projects API
export const getProjects = async (): Promise<Project[]> => {
  return apiCall('/projects');
};

export const getProject = async (id: string): Promise<Project> => {
  return apiCall(`/projects/${id}`);
};

export const createProject = async (name: string, description?: string): Promise<Project> => {
  return apiCall('/projects', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });
};

export const updateProject = async (id: string, name: string, description?: string): Promise<Project> => {
  return apiCall(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name, description }),
  });
};

export const deleteProject = async (id: string): Promise<void> => {
  return apiCall(`/projects/${id}`, {
    method: 'DELETE',
  });
};

// Mitigation Areas API
export const saveMitigationArea = async (
  projectId: string,
  geometry: GeoJSON.GeoJSON,
  areaSqKm: number,
  locationName?: string,
  description?: string
): Promise<MitigationArea> => {
  return apiCall('/areas', {
    method: 'POST',
    body: JSON.stringify({
      project_id: projectId,
      geometry,
      area_sq_km: areaSqKm,
      location_name: locationName,
      description,
    }),
  });
};

export const getMitigationAreas = async (projectId: string): Promise<MitigationArea[]> => {
  return apiCall(`/areas/project/${projectId}`);
};

export const deleteMitigationArea = async (id: string): Promise<void> => {
  return apiCall(`/areas/${id}`, {
    method: 'DELETE',
  });
};

// Simulations API
export const saveSimulation = async (
  projectId: string,
  mitigationAreaId: string,
  selectedIndices: IndexType[],
  coolingCapacityHtml: string,
  correlationData: CorrelationDataPoint[],
  heatmapGeoJson: HeatmapGeoJson | null,
  predictedTempReduction?: number,
  simulatedNdviValue?: number,
  waterSavingsEstimate?: number,
  correlationCoefficient?: number
): Promise<SimulationResult> => {
  return apiCall('/simulations', {
    method: 'POST',
    body: JSON.stringify({
      project_id: projectId,
      mitigation_area_id: mitigationAreaId,
      selected_indices: selectedIndices,
      cooling_capacity_html: coolingCapacityHtml,
      predicted_temp_reduction: predictedTempReduction,
      simulated_ndvi_value: simulatedNdviValue,
      water_savings_estimate: waterSavingsEstimate,
      correlation_data_points: correlationData,
      correlation_coefficient: correlationCoefficient,
      heatmap_geojson: heatmapGeoJson,
    }),
  });
};

export const getSimulation = async (id: string): Promise<SimulationResult> => {
  return apiCall(`/simulations/${id}`);
};

// Raster Files API
export const saveRasterFile = async (
  projectId: string,
  fileName: string,
  fileType: string,
  fileSize: number
): Promise<RasterFile> => {
  return apiCall('/raster-files', {
    method: 'POST',
    body: JSON.stringify({
      project_id: projectId,
      file_name: fileName,
      file_type: fileType,
      file_size: fileSize,
    }),
  });
};

export const getRasterFiles = async (projectId: string): Promise<RasterFile[]> => {
  return apiCall(`/raster-files/project/${projectId}`);
};

// Legacy functions for backward compatibility
export const saveDrawnGeometry = async (layer: L.Layer, docId: string | null): Promise<string | null> => {
  // This is now handled through saveMitigationArea
  return null;
};

export const deleteDrawnGeometry = async (docId: string): Promise<void> => {
  // This is now handled through deleteMitigationArea
};

export const mockVisualizeIndex = (
  indices: IndexType[],
  geoJson: GeoJSON.GeoJSON,
  areaSqKm: string
): Promise<VisualizationResult> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const bounds = L.geoJSON(geoJson).getBounds();

      // Generate correlation data for scatter plot
      const correlationData: CorrelationDataPoint[] = [];
      for (let i = 0; i < 50; i++) {
        const ndvi = Math.random() * 0.6 + 0.2;
        const baseLST = 35 - (ndvi * 15);
        const lst = baseLST + (Math.random() * 5 - 2.5);
        correlationData.push({
          x: parseFloat(ndvi.toFixed(4)),
          y: parseFloat(lst.toFixed(2))
        });
      }

      // Generate heatmap GeoJSON if LST and NDVI are selected
      let heatmapGeoJson: HeatmapGeoJson | null = null;
      if (indices.includes('lst') && indices.includes('ndvi')) {
        const latDelta = bounds.getNorth() - bounds.getSouth();
        const lngDelta = bounds.getEast() - bounds.getWest();

        heatmapGeoJson = {
          type: "FeatureCollection",
          features: []
        };

        // Generate 25 mock grid cells (5x5)
        for (let i = 0; i < 5; i++) {
          for (let j = 0; j < 5; j++) {
            const rValue = parseFloat((Math.random() * (-0.7) - 0.3).toFixed(2));
            let color: string;

            if (rValue < -0.7) color = '#991b1b';
            else if (rValue < -0.4) color = '#ef4444';
            else color = '#facc15';

            const minLat = bounds.getSouth() + (latDelta / 5) * i;
            const maxLat = bounds.getSouth() + (latDelta / 5) * (i + 1);
            const minLng = bounds.getWest() + (lngDelta / 5) * j;
            const maxLng = bounds.getWest() + (lngDelta / 5) * (j + 1);

            heatmapGeoJson.features.push({
              type: "Feature",
              properties: { r_value: rValue, color: color },
              geometry: {
                type: "Polygon",
                coordinates: [[
                  [minLng, minLat],
                  [minLng, maxLat],
                  [maxLng, maxLat],
                  [maxLng, minLat],
                  [minLng, minLat]
                ]]
              }
            });
          }
        }
      }

      const indicesList = indices.join(', ').toUpperCase();
      const avgLSTDrop = (Math.random() * (4.5 - 1.5) + 1.5).toFixed(1);
      const newNDVI = (Math.random() * (0.8 - 0.5) + 0.5).toFixed(3);
      const waterSavings = (parseFloat(areaSqKm) * 500).toFixed(0);

      const result: VisualizationResult = {
        html: `
          <p>The ${areaSqKm} km² proposed greening area was analyzed using ${indicesList}.</p>
          <ul class="list-disc ml-5 mt-2 space-y-1">
            <li>Simulated Cooling Effect (LST): A predicted average reduction of ${avgLSTDrop}°C in Land Surface Temperature, localized to the project area.</li>
            <li>Vegetation Health (NDVI): Modeled future NDVI of ${newNDVI} indicates a highly dense, healthy canopy.</li>
            <li>Water & Air Quality: Based on vegetation type, the area is estimated to capture ${waterSavings} liters/year of rainwater runoff and sequester XX tons of carbon.</li>
            <li>Key Takeaway: This initiative shows high potential for mitigating UHI effects in Lilongwe, specifically targeting thermal hotspots identified by the LST index.</li>
          </ul>
        `,
        correlationData: correlationData,
        heatmapGeoJson: heatmapGeoJson
      };

      resolve(result);
    }, 2500);
  });
};

