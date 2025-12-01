import { useMapContext } from '../context/MapContext';

interface LayersTabProps {
  uploadedRasterFiles: string[];
  uploadedGeoJsonFiles: string[];
  onRasterUpload: (files: FileList | null) => void;
  onGeoJsonUpload: (fileName: string) => void;
}

export const LayersTab = ({ uploadedRasterFiles, uploadedGeoJsonFiles, onRasterUpload, onGeoJsonUpload }: LayersTabProps) => {
  const { addUploadedGeoJson } = useMapContext();

  const handleRasterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    onRasterUpload(e.target.files);
    e.target.value = ''; // Clear to allow re-selection
  };

  const handleGeoJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.geojson')) {
      alert('Error: Only GeoJSON (.json or .geojson) files are supported for vector data.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const geojson = JSON.parse(event.target?.result as string);
        addUploadedGeoJson(geojson);
        onGeoJsonUpload(file.name);
      } catch (error) {
        alert(`Error parsing GeoJSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Clear to allow re-selection
  };

  const getFileIcon = (fileName: string): string => {
    const lower = fileName.toLowerCase();
    if (lower.includes('lst')) return '🔥';
    if (lower.includes('ndvi')) return '🌿';
    if (lower.includes('ndbi')) return '🏙️';
    if (lower.includes('lulc')) return '🗺️';
    return '📁';
  };

  return (
    <div>
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">Upload Local Data</p>

        {/* Raster Upload */}
        <div className="mb-4 p-3 border border-dashed border-gray-300 rounded-md bg-gray-50">
          <label htmlFor="raster-upload" className="block text-sm font-medium text-gray-700 mb-1">
            Upload Raster Index Files (TIF, IMG)
          </label>
          <input
            type="file"
            id="raster-upload"
            accept=".tif,.tiff,.img"
            multiple
            onChange={handleRasterUpload}
            className="w-full text-xs text-gray-600 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="text-xs text-gray-500 mt-1">
            Select LST, NDVI, NDBI, or LULC files (multiple selection 👍).
          </p>
        </div>

        {/* Uploaded Rasters List */}
        {uploadedRasterFiles.length > 0 && (
          <div className="mt-2 mb-4 p-2 bg-white rounded-md border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-1">Uploaded Indices Ready for Analysis:</p>
            <ul className="list-disc ml-5 text-xs text-gray-600 space-y-0.5">
              {uploadedRasterFiles.map((fileName, index) => (
                <li key={index}>{getFileIcon(fileName)} {fileName}</li>
              ))}
            </ul>
          </div>
        )}

        {/* GeoJSON Upload */}
        <div className="mb-2 p-3 border border-dashed border-gray-300 rounded-md bg-gray-50">
          <label htmlFor="geojson-upload" className="block text-sm font-medium text-gray-700 mb-1">
            Upload Vector Boundary (GeoJSON)
          </label>
          <input
            type="file"
            id="geojson-upload"
            accept=".geojson,.json"
            onChange={handleGeoJsonUpload}
            className="w-full text-xs text-gray-600 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          />
          <p className="text-xs text-gray-500 mt-1">Boundary data for context or analysis.</p>
        </div>

        {/* Uploaded GeoJSON Files List */}
        {uploadedGeoJsonFiles.length > 0 && (
          <div className="mt-2 mb-4 p-2 bg-white rounded-md border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-1">Uploaded Vector Boundaries:</p>
            <ul className="list-disc ml-5 text-xs text-gray-600 space-y-0.5">
              {uploadedGeoJsonFiles.map((fileName, index) => (
                <li key={index}>🗺️ {fileName}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

