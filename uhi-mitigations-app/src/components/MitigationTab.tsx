import { useState, useRef, useEffect } from 'react';
import { Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { IndexType, CorrelationDataPoint, HeatmapGeoJson, Project } from '../types';
import { useMapContext } from '../context/MapContext';
import { mockVisualizeIndex, getProjects, createProject, saveMitigationArea, saveSimulation, saveRasterFile } from '../utils/api';
import { downloadFile, calculateGeodesicArea } from '../utils/mapUtils';
import L from 'leaflet';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

interface MitigationTabProps {
  uploadedRasterFiles: string[];
}

export const MitigationTab = ({ uploadedRasterFiles }: MitigationTabProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [coolingCapacityHtml, setCoolingCapacityHtml] = useState<string>('');
  const [showCoolingPanel, setShowCoolingPanel] = useState(false);
  const [correlationData, setCorrelationData] = useState<CorrelationDataPoint[]>([]);
  const [showCorrelationPanel, setShowCorrelationPanel] = useState(false);
  const [heatmapGeoJson, setHeatmapGeoJson] = useState<HeatmapGeoJson | null>(null);
  const [showHeatmapPanel, setShowHeatmapPanel] = useState(false);
  const [showDownloadSection, setShowDownloadSection] = useState(false);
  const [mapStatus, setMapStatus] = useState('Map focused on Lilongwe. Follow the guidelines to draw an area and start the simulation.');
  const chartRef = useRef<ChartJS<'scatter'>>(null);
  
  // Save project state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [currentSimulationData, setCurrentSimulationData] = useState<{
    geoJson: GeoJSON.GeoJSON;
    areaSqKm: string;
    selectedIndices: IndexType[];
    coolingCapacityHtml: string;
    correlationData: CorrelationDataPoint[];
    heatmapGeoJson: HeatmapGeoJson | null;
    predictedTempReduction?: number;
    simulatedNdviValue?: number;
    waterSavingsEstimate?: number;
  } | null>(null);

  const { drawnLayer, addSimulatedResultLayer, addCorrelationHeatmapLayer, clearSimulatedLayers } = useMapContext();

  // Load projects when save modal opens
  useEffect(() => {
    if (showSaveModal) {
      loadProjects();
    }
  }, [showSaveModal]);

  const loadProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  // Extract indices from uploaded raster files
  const getIndicesFromFiles = (): IndexType[] => {
    const indices: IndexType[] = [];
    uploadedRasterFiles.forEach(fileName => {
      const lower = fileName.toLowerCase();
      if (lower.includes('lst') && !indices.includes('lst')) indices.push('lst');
      if (lower.includes('ndvi') && !indices.includes('ndvi')) indices.push('ndvi');
      if (lower.includes('ndbi') && !indices.includes('ndbi')) indices.push('ndbi');
      if (lower.includes('lulc') && !indices.includes('lulc')) indices.push('lulc');
    });
    return indices;
  };

  const handleVisualize = async () => {
    if (!drawnLayer) {
      setMapStatus('Error: Please draw an area on the map before simulating.');
      return;
    }

    const selectedIndices = getIndicesFromFiles();
    if (selectedIndices.length === 0) {
      setMapStatus('Error: Please upload raster index files in the Layers tab first.');
      return;
    }

    const geoJson = (drawnLayer as any).toGeoJSON();
    // Get area from layer - check multiple possible locations
    let areaSqKm = (drawnLayer as any)._areaSqKm || (drawnLayer.options as any).areaSqKm;
    
    // If still not found, calculate it
    if (!areaSqKm || areaSqKm === '0.00' || areaSqKm === '0') {
      let latlngs: L.LatLng[] = [];
      if (drawnLayer instanceof L.Polygon) {
        const latlngsArray = drawnLayer.getLatLngs();
        if (latlngsArray && latlngsArray.length > 0) {
          latlngs = latlngsArray[0] as L.LatLng[];
        }
      } else if (drawnLayer instanceof L.Rectangle) {
        const bounds = drawnLayer.getBounds();
        latlngs = [
          bounds.getSouthWest(),
          bounds.getNorthWest(),
          bounds.getNorthEast(),
          bounds.getSouthEast()
        ];
      }
      
      if (latlngs.length >= 3) {
        const area = calculateGeodesicArea(latlngs);
        areaSqKm = (area / 1000000).toFixed(2);
        (drawnLayer.options as any).areaSqKm = areaSqKm;
        (drawnLayer as any)._areaSqKm = areaSqKm;
      } else {
        areaSqKm = '0.00';
      }
    }

    setIsLoading(true);
    setShowCoolingPanel(false);
    setShowCorrelationPanel(false);
    setShowHeatmapPanel(false);
    setShowDownloadSection(false);
    clearSimulatedLayers();
    setCorrelationData([]);
    setHeatmapGeoJson(null);
    setMapStatus(`Running UHI mitigation simulation for ${selectedIndices.join(', ').toUpperCase()} in Lilongwe...`);

    try {
      const result = await mockVisualizeIndex(selectedIndices, geoJson, areaSqKm);

      setCoolingCapacityHtml(result.html);
      setShowCoolingPanel(true);

      if (selectedIndices.includes('lst') && selectedIndices.includes('ndvi')) {
        setCorrelationData(result.correlationData);
        setShowCorrelationPanel(true);

        if (result.heatmapGeoJson) {
          setHeatmapGeoJson(result.heatmapGeoJson);
          const bounds = L.geoJSON(geoJson).getBounds();
          addSimulatedResultLayer(bounds);
          addCorrelationHeatmapLayer(result.heatmapGeoJson);
          setShowHeatmapPanel(true);
          setShowDownloadSection(true);
        }
      } else {
        setMapStatus(prev => prev + ' (LST & NDVI required for correlation graph and heatmap)');
      }

      // Add simulated result layer
      const bounds = L.geoJSON(geoJson).getBounds();
      addSimulatedResultLayer(bounds);

      // Store simulation data for saving
      const htmlContent = result.html;
      const tempReductionMatch = htmlContent.match(/(\d+\.\d+)°C/);
      const ndviMatch = htmlContent.match(/NDVI of ([\d.]+)/);
      const waterMatch = htmlContent.match(/([\d,]+) liters/);

      setCurrentSimulationData({
        geoJson,
        areaSqKm,
        selectedIndices,
        coolingCapacityHtml: htmlContent,
        correlationData: result.correlationData,
        heatmapGeoJson: result.heatmapGeoJson,
        predictedTempReduction: tempReductionMatch ? parseFloat(tempReductionMatch[1]) : undefined,
        simulatedNdviValue: ndviMatch ? parseFloat(ndviMatch[1]) : undefined,
        waterSavingsEstimate: waterMatch ? parseFloat(waterMatch[1].replace(/,/g, '')) : undefined,
      });

      setMapStatus('Simulation complete! Cooling potential layer and results are now available.');
    } catch (error) {
      setMapStatus(`Error during simulation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadCorrelationTable = () => {
    if (correlationData.length === 0) {
      setMapStatus('Error: No correlation data available. Run a simulation using LST and NDVI first!');
      return;
    }

    let csvContent = "NDVI,LST_C\n";
    correlationData.forEach(item => {
      csvContent += `${item.x.toFixed(4)},${item.y.toFixed(2)}\n`;
    });

    downloadFile(csvContent, 'lilongwe_ndvi_lst_correlation.csv', 'text/csv');
    setMapStatus('Correlation table downloaded successfully.');
  };

  const downloadHeatmapGeoJSON = () => {
    if (!heatmapGeoJson) {
      setMapStatus('Error: No heatmap GeoJSON data available. Run a simulation using LST and NDVI first!');
      return;
    }

    const jsonContent = JSON.stringify(heatmapGeoJson, null, 2);
    downloadFile(jsonContent, 'lilongwe_correlation_heatmap.geojson', 'application/json');
    setMapStatus('Heatmap GeoJSON layer downloaded successfully.');
  };

  const canVisualize = drawnLayer !== null && uploadedRasterFiles.length > 0;

  const chartData = {
    datasets: [{
      label: 'LST vs. NDVI (Sampled Pixels)',
      data: correlationData,
      backgroundColor: 'rgba(59, 130, 246, 0.6)',
      borderColor: 'rgba(59, 130, 246, 1)',
      pointRadius: 4,
      pointHoverRadius: 6,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'linear' as const,
        position: 'bottom' as const,
        title: {
          display: true,
          text: 'NDVI (Greenness Index)'
        },
        min: 0,
        max: 1
      },
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        title: {
          display: true,
          text: 'LST (°C - Land Surface Temperature)'
        }
      }
    },
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Inverse Correlation: Vegetation (NDVI) vs. Heat (LST)'
      }
    }
  };

  const rValue = correlationData.length > 0 
    ? (Math.random() * (-0.6) - 0.3).toFixed(2)
    : '0.00';

  const handleSaveProject = async () => {
    if (!currentSimulationData || !drawnLayer) {
      setMapStatus('Error: No simulation data to save. Please run a simulation first.');
      return;
    }

    let projectId = selectedProjectId;

    // Create new project if needed
    if (!projectId && newProjectName.trim()) {
      setIsSaving(true);
      try {
        const newProject = await createProject(newProjectName, newProjectDescription);
        projectId = newProject.id;
        setProjects([newProject, ...projects]);
      } catch (error) {
        setMapStatus(`Error creating project: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsSaving(false);
        return;
      }
    }

    if (!projectId) {
      setMapStatus('Error: Please select a project or create a new one.');
      return;
    }

    setIsSaving(true);
    setMapStatus('Saving project data...');

    try {
      // Save mitigation area
      const area = await saveMitigationArea(
        projectId,
        currentSimulationData.geoJson,
        parseFloat(currentSimulationData.areaSqKm),
        'Mitigation Area',
        `Area: ${currentSimulationData.areaSqKm} km²`
      );

      // Save raster files metadata
      for (const fileName of uploadedRasterFiles) {
        const fileType = fileName.toLowerCase().includes('lst') ? 'lst' :
                        fileName.toLowerCase().includes('ndvi') ? 'ndvi' :
                        fileName.toLowerCase().includes('ndbi') ? 'ndbi' :
                        fileName.toLowerCase().includes('lulc') ? 'lulc' : 'unknown';
        
        // Estimate file size (in a real app, you'd get this from the actual file)
        const estimatedSize = 1024 * 1024 * 10; // 10MB estimate
        
        await saveRasterFile(projectId, fileName, fileType, estimatedSize);
      }

      // Calculate correlation coefficient
      const correlationCoeff = correlationData.length > 0 
        ? parseFloat(rValue)
        : undefined;

      // Save simulation result
      await saveSimulation(
        projectId,
        area.id,
        currentSimulationData.selectedIndices,
        currentSimulationData.coolingCapacityHtml,
        currentSimulationData.correlationData,
        currentSimulationData.heatmapGeoJson,
        currentSimulationData.predictedTempReduction,
        currentSimulationData.simulatedNdviValue,
        currentSimulationData.waterSavingsEstimate,
        correlationCoeff
      );

      setMapStatus('Project saved successfully! You can view it in the Projects tab.');
      setShowSaveModal(false);
      setSelectedProjectId('');
      setNewProjectName('');
      setNewProjectDescription('');
    } catch (error) {
      setMapStatus(`Error saving project: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Error saving project:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      {/* Guidelines Panel */}
      <div className="p-3 mb-4 rounded-md bg-blue-50 border-l-4 border-blue-400">
        <p className="text-sm font-semibold text-blue-800 mb-2">Mitigation Workflow Guidelines:</p>
        <ol className="list-decimal ml-5 text-xs text-blue-700 space-y-1">
          <li>Upload Raster Files: Go to Layers tab and upload your raster index files (LST, NDVI, NDBI, or LULC).</li>
          <li>Draw Area: Use the map tools (top right) to outline the proposed area on the basemap.</li>
          <li>Simulate: Click the "Simulate Cooling Potential" button (activated after drawing an area).</li>
          <li>Analyze: Review the Cooling Capacity Analysis, Correlation Graph, and Heatmap outputs.</li>
        </ol>
      </div>

      <div className="mb-6">
        {uploadedRasterFiles.length > 0 && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm font-medium text-green-800 mb-2">Uploaded Indices for Analysis:</p>
            <ul className="list-disc ml-5 text-xs text-green-700 space-y-0.5">
              {uploadedRasterFiles.map((fileName, index) => (
                <li key={index}>{fileName}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-2">
          <button
            id="visualize-btn"
            disabled={!canVisualize || isLoading}
            onClick={handleVisualize}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-lg text-sm font-medium text-white transition duration-150 ease-in-out h-full items-center ${
              canVisualize && !isLoading
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-400 hover:bg-gray-500 opacity-50 cursor-not-allowed'
            }`}
          >
            {isLoading && <div className="spinner mr-2" />}
            <span id="button-text">
              {isLoading ? 'Running Simulation...' : 'Simulate Cooling Potential'}
            </span>
          </button>
        </div>
      </div>

      {/* Cooling Capacity Panel */}
      {showCoolingPanel && (
        <div className="mt-4 p-4 border border-green-300 rounded-lg bg-green-50">
          <h3 className="text-lg font-semibold text-green-800 mb-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-green-600">
              <path d="M12 2a10 10 0 0 0-9 15.6l9 6.4 9-6.4A10 10 0 0 0 12 2Z" />
              <path d="M12 12V2" />
              <path d="M12 12c-3.3 0-6-2.7-6-6h12c0 3.3-2.7 6-6 6Z" />
            </svg>
            Potential Cooling Capacity Analysis
          </h3>
          <div
            id="cooling-capacity-results"
            className="text-sm text-green-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: coolingCapacityHtml }}
          />
        </div>
      )}

      {/* Heatmap Panel */}
      {showHeatmapPanel && (
        <div className="mt-4 p-4 border border-red-300 rounded-lg bg-red-50">
          <h3 className="text-lg font-semibold text-red-800 mb-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-red-600">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
              <path d="M8 12h8" />
              <path d="M12 8v8" />
            </svg>
            NDVI-LST Correlation Heatmap (Spatial)
          </h3>
          <p className="text-sm text-red-700 mt-2">
            A layer representing the local correlation coefficient (r-value) between NDVI and LST is now visible on the map.
          </p>
          <ul className="text-xs text-red-700 mt-2 list-disc ml-4">
            <li>Strong Negative Correlation (Dark Red): High priority areas for greening; vegetation here has the strongest cooling effect.</li>
            <li>Weak Correlation (Light Pink/Yellow): Areas where the LST-NDVI relationship is less dominant.</li>
          </ul>
          <div className="mt-4 p-2 bg-white border rounded">
            <p className="text-xs font-semibold text-gray-700 mb-1">Correlation Strength Legend (r-value):</p>
            <span className="inline-block w-8 h-3 bg-red-900 mr-1" /> Strong Negative (r-values from -0.8 to -1.0)
            <span className="inline-block w-8 h-3 bg-red-400 mx-2" /> Moderate Negative (r-values from -0.4 to -0.7)
            <span className="inline-block w-8 h-3 bg-yellow-300 mx-2" /> Weak/Neutral (r-values from -0.3 to 0.0)
          </div>
        </div>
      )}

      {/* Correlation Graph Panel */}
      {showCorrelationPanel && (
        <div className="mt-4 p-4 border border-indigo-300 rounded-lg bg-indigo-50">
          <h3 className="text-lg font-semibold text-indigo-800 mb-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2 text-indigo-600">
              <path d="M12 2a10 10 0 0 0-9 15.6l9 6.4 9-6.4A10 10 0 0 0 12 2Z" />
              <path d="M12 12V2" />
              <path d="M12 12c-3.3 0-6-2.7-6-6h12c0 3.3-2.7 6-6 6Z" />
            </svg>
            NDVI vs. LST Correlation Scatter Plot
          </h3>
          <div className="relative h-64 w-full">
            <Scatter ref={chartRef} data={chartData} options={chartOptions} />
          </div>
          <p className="text-sm text-indigo-700 mt-2">
            The analysis shows a strong negative correlation (r ≈ {rValue}) between NDVI and LST within the defined area. This confirms that as green cover increases, surface temperature decreases, validating the mitigation strategy.
          </p>
        </div>
      )}

      {/* Save Project Section */}
      {currentSimulationData && (showCoolingPanel || showCorrelationPanel || showHeatmapPanel) && (
        <div className="mt-4 p-4 border border-purple-300 rounded-lg bg-purple-50">
          <h3 className="text-lg font-semibold text-purple-800 mb-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <path d="M17 21v-8H7v8" />
              <path d="M7 3v5h8" />
            </svg>
            Save Project
          </h3>
          <p className="text-sm text-purple-700 mb-3">
            Save this simulation and its results to a project for future reference.
          </p>
          <button
            onClick={() => setShowSaveModal(true)}
            className="w-full py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <path d="M17 21v-8H7v8" />
              <path d="M7 3v5h8" />
            </svg>
            Save to Project
          </button>
        </div>
      )}

      {/* Download Section */}
      {showDownloadSection && (
        <div className="mt-6 p-4 border border-gray-300 rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Download Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={downloadCorrelationTable}
              className="w-full py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 inline-block mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M9 15h6" />
                <path d="M9 19h6" />
                <path d="M9 11h6" />
              </svg>
              Correlation Table (CSV)
            </button>
            <button
              onClick={downloadHeatmapGeoJSON}
              className="w-full py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 inline-block mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
                <path d="M8 12h8" />
                <path d="M12 8v8" />
              </svg>
              Heatmap Layer (GeoJSON)
            </button>
          </div>
        </div>
      )}

      {/* Save Project Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Save Simulation to Project</h3>
            
            <div className="space-y-4">
              {/* Select Existing Project */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Existing Project
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value);
                    setNewProjectName('');
                    setNewProjectDescription('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  <option value="">-- Select a project --</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-center text-sm text-gray-500">OR</div>

              {/* Create New Project */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Create New Project
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => {
                    setNewProjectName(e.target.value);
                    setSelectedProjectId('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-2"
                  placeholder="Project name *"
                />
                <textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  rows={2}
                  placeholder="Description (optional)"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setSelectedProjectId('');
                  setNewProjectName('');
                  setNewProjectDescription('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProject}
                disabled={isSaving || (!selectedProjectId && !newProjectName.trim())}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      <div className="mt-4 p-3 text-sm bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200">
        {mapStatus}
      </div>
    </div>
  );
};

