import { useState } from 'react';
import type { BasemapType } from '../types';
import { useMapContext } from '../context/MapContext';

export const BasemapsTab = () => {
  const { switchBasemap } = useMapContext();
  const [selectedBasemap, setSelectedBasemap] = useState<BasemapType>('esri_satellite');

  const handleBasemapChange = (basemap: BasemapType) => {
    setSelectedBasemap(basemap);
    switchBasemap(basemap);
  };

  return (
    <div>
      <p className="text-sm text-gray-500 mb-3">Select the underlying basemap for spatial context:</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <label className="flex items-center p-2 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100 transition">
          <input
            type="radio"
            name="basemap"
            value="esri_satellite"
            checked={selectedBasemap === 'esri_satellite'}
            onChange={() => handleBasemapChange('esri_satellite')}
            className="form-radio h-4 w-4 text-blue-600"
          />
          <span className="ml-3 text-sm font-medium text-gray-700">ESRI Satellite</span>
        </label>
        <label className="flex items-center p-2 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100 transition">
          <input
            type="radio"
            name="basemap"
            value="osm"
            checked={selectedBasemap === 'osm'}
            onChange={() => handleBasemapChange('osm')}
            className="form-radio h-4 w-4 text-blue-600"
          />
          <span className="ml-3 text-sm font-medium text-gray-700">OpenStreetMap</span>
        </label>
        <label className="flex items-center p-2 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100 transition">
          <input
            type="radio"
            name="basemap"
            value="topo"
            checked={selectedBasemap === 'topo'}
            onChange={() => handleBasemapChange('topo')}
            className="form-radio h-4 w-4 text-blue-600"
          />
          <span className="ml-3 text-sm font-medium text-gray-700">ESRI World Topo</span>
        </label>
        <label className="flex items-center p-2 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100 transition">
          <input
            type="radio"
            name="basemap"
            value="light"
            checked={selectedBasemap === 'light'}
            onChange={() => handleBasemapChange('light')}
            className="form-radio h-4 w-4 text-blue-600"
          />
          <span className="ml-3 text-sm font-medium text-gray-700">CartoDB Positron</span>
        </label>
        <label className="flex items-center p-2 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100 transition">
          <input
            type="radio"
            name="basemap"
            value="esri_streets"
            checked={selectedBasemap === 'esri_streets'}
            onChange={() => handleBasemapChange('esri_streets')}
            className="form-radio h-4 w-4 text-blue-600"
          />
          <span className="ml-3 text-sm font-medium text-gray-700">ESRI World Streets</span>
        </label>
        <label className="flex items-center p-2 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100 transition">
          <input
            type="radio"
            name="basemap"
            value="esri_gray"
            checked={selectedBasemap === 'esri_gray'}
            onChange={() => handleBasemapChange('esri_gray')}
            className="form-radio h-4 w-4 text-blue-600"
          />
          <span className="ml-3 text-sm font-medium text-gray-700">ESRI Gray Canvas</span>
        </label>
      </div>
    </div>
  );
};

