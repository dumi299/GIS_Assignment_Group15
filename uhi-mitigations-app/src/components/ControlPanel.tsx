import { useState } from 'react';
import { TabType } from '../types';
import { MitigationTab } from './MitigationTab';
import { LayersTab } from './LayersTab';
import { BasemapsTab } from './BasemapsTab';
import { ProjectsTab } from './ProjectsTab';

export const ControlPanel = () => {
  const [activeTab, setActiveTab] = useState<TabType | null>('mitigation');
  const [uploadedRasterFiles, setUploadedRasterFiles] = useState<string[]>([]);
  const [uploadedGeoJsonFiles, setUploadedGeoJsonFiles] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  const showTab = (tabId: TabType) => {
    if (activeTab === tabId) {
      setActiveTab(null);
    } else {
      setActiveTab(tabId);
    }
  };

  const handleRasterUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    const newFileNames = newFiles.map(f => f.name);
    
    setUploadedRasterFiles(prev => {
      const combined = [...prev];
      newFileNames.forEach(name => {
        if (!combined.includes(name)) {
          combined.push(name);
        }
      });
      return combined;
    });
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed right-4 top-1/2 transform -translate-y-1/2 z-[1001] bg-white p-3 rounded-l-lg shadow-lg hover:bg-gray-50 transition-all duration-300 flex items-center justify-center"
        title="Show Control Panel"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-gray-700">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
    );
  }

  return (
    <>
      <div className="sidebar-container-right pointer-events-none">
        <div id="controls" className="bg-white p-6 rounded-xl shadow-2xl pointer-events-auto transition-all duration-300 relative">
          <button
            onClick={() => setIsVisible(false)}
            className="absolute -left-10 top-4 bg-white p-2 rounded-l-lg shadow-lg hover:bg-gray-50 transition-all duration-300 flex items-center justify-center z-10"
            title="Hide Control Panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-700">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        <h1 className="text-lg font-bold text-gray-800 mb-2">
          Research Projects: Geography, Earth Sciences & Environment (University of Malawi)
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          Assessing the Role of Urban Vegetation in Heat Island Mitigation:
          A Quantitative Analysis in Lilongwe City.
        </p>

        {/* Tab Navigation */}
        <div id="tab-nav" className="flex flex-wrap">
          <button
            className={`tab-button flex-1 py-2 text-sm text-gray-600 hover:text-blue-500 transition duration-150 flex items-center justify-center ${
              activeTab === 'mitigation' ? 'active' : ''
            }`}
            onClick={() => showTab('mitigation')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-1">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            Mitigation
          </button>
          <button
            className={`tab-button flex-1 py-2 text-sm text-gray-600 hover:text-blue-500 transition duration-150 flex items-center justify-center ${
              activeTab === 'layers' ? 'active' : ''
            }`}
            onClick={() => showTab('layers')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-1">
              <path d="m12 19-8.5-4.5c-.7-.3-1.1-1.1-1.1-1.9V8.5c0-.7.4-1.4 1.1-1.8L12 3l8.5 4.5c.7.4 1.1 1.1 1.1 1.9v4.1c0 .7-.4 1.4-1.1 1.8L12 19Z" />
              <path d="m12 19 8.5-4.5" />
              <path d="M12 3v16" />
              <path d="m4.8 14.5 7.2 4.5 7.2-4.5" />
            </svg>
            Layers
          </button>
          <button
            className={`tab-button flex-1 py-2 text-sm text-gray-600 hover:text-blue-500 transition duration-150 flex items-center justify-center ${
              activeTab === 'basemaps' ? 'active' : ''
            }`}
            onClick={() => showTab('basemaps')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-1">
              <path d="M14.12 10.12A2.12 2.12 0 0 0 12 12a2.12 2.12 0 0 0 2.12-2.12Z" />
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Z" />
              <path d="M21.5 7.5L12 12 2.5 7.5" />
              <path d="M12 22V2" />
            </svg>
            Basemaps
          </button>
          <button
            className={`tab-button flex-1 py-2 text-sm text-gray-600 hover:text-blue-500 transition duration-150 flex items-center justify-center ${
              activeTab === 'projects' ? 'active' : ''
            }`}
            onClick={() => showTab('projects')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-1">
              <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              <path d="M4 12c0 2.21 3.582 4 8 4s8-1.79 8-4" />
            </svg>
            Projects
          </button>
        </div>

        {/* Tab Content Container */}
        {activeTab && (
          <div id="content-container" className="content-panel">
            {activeTab === 'mitigation' && <MitigationTab uploadedRasterFiles={uploadedRasterFiles} />}
            {activeTab === 'layers' && (
              <LayersTab 
                uploadedRasterFiles={uploadedRasterFiles} 
                uploadedGeoJsonFiles={uploadedGeoJsonFiles}
                onRasterUpload={handleRasterUpload}
                onGeoJsonUpload={(fileName: string) => {
                  setUploadedGeoJsonFiles(prev => {
                    if (!prev.includes(fileName)) {
                      return [...prev, fileName];
                    }
                    return prev;
                  });
                }}
              />
            )}
            {activeTab === 'basemaps' && <BasemapsTab />}
            {activeTab === 'projects' && <ProjectsTab />}
          </div>
        )}
        </div>
      </div>
    </>
  );
};

