import { createContext, useContext, ReactNode } from 'react';
import L from 'leaflet';
import { BasemapType, IndexType } from '../types';

interface MapContextType {
  map: L.Map | null;
  drawnLayer: L.Layer | null;
  switchBasemap: (key: BasemapType) => void;
  toggleIndexLayer: (index: IndexType, isChecked: boolean) => void;
  addUploadedGeoJson: (geojson: GeoJSON.GeoJSON) => void;
  addSimulatedResultLayer: (bounds: L.LatLngBounds) => void;
  addCorrelationHeatmapLayer: (geojson: GeoJSON.GeoJSON) => void;
  clearSimulatedLayers: () => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export const useMapContext = () => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMapContext must be used within MapProvider');
  }
  return context;
};

interface MapProviderProps {
  children: ReactNode;
  value: MapContextType;
}

export const MapProvider = ({ children, value }: MapProviderProps) => {
  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
};

