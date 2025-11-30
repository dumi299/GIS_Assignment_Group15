import { useState, useEffect } from 'react';
import type { Project, SimulationResult } from '../types';
import { getProjects, getProject, deleteProject, createProject } from '../utils/api';
import { useMapContext } from '../context/MapContext';
import L from 'leaflet';

export const ProjectsTab = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const { map } = useMapContext();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load projects';
      // Check if it's a connection error
      if (errorMessage.includes('Cannot connect to backend') || errorMessage.includes('Failed to fetch')) {
        setError('Backend server is not running. Please start the server by running "npm run dev" in the server directory.');
      } else {
        setError(errorMessage);
      }
      console.error('Error loading projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProject = async (projectId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const project = await getProject(projectId);
      setSelectedProject(project);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
      console.error('Error loading project:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      setError('Project name is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const project = await createProject(newProjectName, newProjectDescription);
      setProjects([project, ...projects]);
      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectDescription('');
      setSelectedProject(project);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
      // Check if it's a connection error
      if (errorMessage.includes('Cannot connect to backend') || errorMessage.includes('Failed to fetch')) {
        setError('Backend server is not running. Please start the server by running "npm run dev" in the server directory.');
      } else {
        setError(errorMessage);
      }
      console.error('Error creating project:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This will delete all associated data.')) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await deleteProject(projectId);
      setProjects(projects.filter(p => p.id !== projectId));
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
      console.error('Error deleting project:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSimulationOnMap = (simulation: SimulationResult) => {
    console.log('Loading simulation on map:', simulation);
    
    if (!map) {
      console.error('Map is not available');
      setError('Map is not initialized');
      return;
    }

    if (!simulation.area_geometry) {
      console.error('No area geometry found in simulation');
      setError('No geometry data found for this simulation');
      return;
    }

    try {
      // Clear existing drawn layers (but keep basemap)
      map.eachLayer((layer) => {
        if (layer instanceof L.GeoJSON || layer instanceof L.Polygon || layer instanceof L.Rectangle) {
          map.removeLayer(layer);
        }
      });

      // Load area geometry
      const areaLayer = L.geoJSON(simulation.area_geometry as GeoJSON.GeoJSON, {
        style: {
          color: '#3388ff',
          weight: 3,
          fillColor: '#3388ff',
          fillOpacity: 0.2,
        },
      });
      areaLayer.addTo(map);
      
      // Fit map to the area bounds
      const bounds = areaLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }

      // Load heatmap if available
      if (simulation.heatmap_geojson) {
        const heatmapLayer = L.geoJSON(simulation.heatmap_geojson, {
          style: (feature) => {
            const props = feature?.properties as { color?: string };
            return {
              color: props?.color || '#ef4444',
              weight: 1,
              fillColor: props?.color || '#ef4444',
              fillOpacity: 0.6,
            };
          },
        });
        heatmapLayer.addTo(map);
      }

      setError(null);
      console.log('Successfully loaded simulation on map');
    } catch (err) {
      console.error('Error loading simulation on map:', err);
      setError('Failed to load simulation on map');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (selectedProject) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setSelectedProject(null)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Projects
          </button>
          <button
            onClick={() => handleDeleteProject(selectedProject.id)}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Delete Project
          </button>
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-800 mb-1">{selectedProject.name}</h2>
          {selectedProject.description && (
            <p className="text-sm text-gray-600 mb-2">{selectedProject.description}</p>
          )}
          <p className="text-xs text-gray-500">
            Created: {formatDate(selectedProject.created_at)} | 
            Updated: {formatDate(selectedProject.updated_at)}
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="p-2 bg-blue-50 rounded border border-blue-200">
            <p className="text-xs text-blue-600 font-medium">Mitigation Areas</p>
            <p className="text-lg font-bold text-blue-800">{selectedProject.mitigation_areas?.length || 0}</p>
          </div>
          <div className="p-2 bg-green-50 rounded border border-green-200">
            <p className="text-xs text-green-600 font-medium">Simulations</p>
            <p className="text-lg font-bold text-green-800">{selectedProject.simulations?.length || 0}</p>
          </div>
        </div>

        {/* Mitigation Areas */}
        {selectedProject.mitigation_areas && selectedProject.mitigation_areas.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Mitigation Areas</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {selectedProject.mitigation_areas.map((area) => (
                <div key={area.id} className="p-2 bg-gray-50 rounded border border-gray-200 text-xs">
                  <p className="font-medium text-gray-700">
                    {area.location_name || 'Unnamed Area'}
                  </p>
                  <p className="text-gray-600">
                    {area.area_sq_km} km² • {formatDate(area.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Simulations */}
        {selectedProject.simulations && selectedProject.simulations.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Simulation Results</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selectedProject.simulations.map((sim) => (
                <div
                  key={sim.id}
                  className="p-3 bg-indigo-50 rounded border border-indigo-200 cursor-pointer hover:bg-indigo-100 transition"
                  onClick={() => loadSimulationOnMap(sim)}
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-xs font-medium text-indigo-800">
                      {sim.location_name || 'Simulation'}
                    </p>
                    <span className="text-xs text-indigo-600">{formatDate(sim.timestamp)}</span>
                  </div>
                  <p className="text-xs text-indigo-700 mb-1">
                    Indices: {sim.selected_indices.join(', ').toUpperCase()}
                  </p>
                  {sim.predicted_temp_reduction && (
                    <p className="text-xs text-indigo-700">
                      Temp Reduction: {sim.predicted_temp_reduction}°C
                    </p>
                  )}
                  {sim.correlation_coefficient != null && (
                    <p className="text-xs text-indigo-700">
                      Correlation: {Number(sim.correlation_coefficient).toFixed(3)}
                    </p>
                  )}
                  <p className="text-xs text-indigo-600 mt-1 italic">Click to view on map</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!selectedProject.mitigation_areas || selectedProject.mitigation_areas.length === 0) &&
         (!selectedProject.simulations || selectedProject.simulations.length === 0) && (
          <div className="text-center py-4 text-sm text-gray-500">
            No data saved for this project yet.
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">Saved Projects</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Project
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          <div className="font-semibold mb-1">⚠️ Connection Error</div>
          <div className="text-xs">{error}</div>
          {error.includes('Backend server is not running') && (
            <div className="mt-2 p-2 bg-white rounded border border-red-300 text-xs">
              <p className="font-semibold mb-1">To fix this:</p>
              <ol className="list-decimal ml-4 space-y-1">
                <li>Open a terminal in the <code className="bg-gray-100 px-1 rounded">server</code> directory</li>
                <li>Run: <code className="bg-gray-100 px-1 rounded">npm install</code> (if not done already)</li>
                <li>Run: <code className="bg-gray-100 px-1 rounded">npm run dev</code></li>
                <li>Make sure you see: "🚀 Server running on http://localhost:3001"</li>
              </ol>
              <p className="mt-2 text-gray-600">See <code className="bg-gray-100 px-1 rounded">QUICK_START.md</code> for detailed instructions.</p>
            </div>
          )}
        </div>
      )}

      {isLoading && projects.length === 0 ? (
        <div className="text-center py-4 text-sm text-gray-500">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-4 text-sm text-gray-500">
          No projects yet. Create your first project to start saving your work!
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {projects.map((project) => (
            <div
              key={project.id}
              className="p-3 bg-white border border-gray-200 rounded cursor-pointer hover:bg-gray-50 transition"
              onClick={() => handleSelectProject(project.id)}
            >
              <div className="flex items-start justify-between mb-1">
                <h3 className="text-sm font-semibold text-gray-800">{project.name}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProject(project.id);
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
              {project.description && (
                <p className="text-xs text-gray-600 mb-2 line-clamp-2">{project.description}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{project.area_count || 0} areas</span>
                <span>•</span>
                <span>{project.simulation_count || 0} simulations</span>
                <span>•</span>
                <span>{formatDate(project.updated_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Create New Project</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  rows={3}
                  placeholder="Enter project description"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewProjectName('');
                  setNewProjectDescription('');
                  setError(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={isLoading || !newProjectName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

