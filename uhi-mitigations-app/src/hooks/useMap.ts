import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet-draw';
import type { BasemapType, IndexType } from '../types';
import { calculateGeodesicArea } from '../utils/mapUtils';

export const useMap = (mapContainerRef: React.RefObject<HTMLDivElement>) => {
  const mapRef = useRef<L.Map | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const [currentBasemap, setCurrentBasemap] = useState<BasemapType>('esri_satellite');
  const [drawnLayer, setDrawnLayer] = useState<L.Layer | null>(null);
  const [uploadedGeoJsonLayer, setUploadedGeoJsonLayer] = useState<L.GeoJSON | null>(null);
  const [simulatedResultLayer, setSimulatedResultLayer] = useState<L.Layer | null>(null);
  const [correlationHeatmapLayer, setCorrelationHeatmapLayer] = useState<L.GeoJSON | null>(null);
  // Use refs to track simulated layers for reliable access in event handlers
  const simulatedResultLayerRef = useRef<L.Layer | null>(null);
  const correlationHeatmapLayerRef = useRef<L.GeoJSON | null>(null);
  const [cachedIndexLayers, setCachedIndexLayers] = useState<Record<IndexType, L.Rectangle | null>>({
    lst: null,
    ndvi: null,
    ndbi: null,
    lulc: null,
  });

  const basemapLayers: Record<BasemapType, L.TileLayer> = {
    esri_satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 19
    }),
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }),
    topo: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 17
    }),
    light: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }),
    esri_streets: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 19
    }),
    esri_gray: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 19
    })
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    const mapInstance = L.map(mapContainerRef.current).setView([-13.9669, 33.7717], 12);
    mapRef.current = mapInstance;
    setMap(mapInstance);

    // Add default basemap
    const defaultBasemap = basemapLayers[currentBasemap];
    defaultBasemap.addTo(mapInstance);

    // Initialize drawn items
    const drawnItems = new L.FeatureGroup();
    mapInstance.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    // Add draw control with improved settings
    const drawControl = new L.Control.Draw({
      edit: { 
        featureGroup: drawnItems,
        remove: true,
        edit: {
          selectedPathOptions: {
            maintainColor: false,
            color: '#ff0000',
            weight: 4
          }
        }
      },
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          drawError: {
            color: '#e1e100',
            message: '<strong>Oh snap!</strong> you can\'t draw that!'
          },
          shapeOptions: {
            color: '#3388ff',
            weight: 3,
            fillOpacity: 0.2
          }
        },
        rectangle: {
          shapeOptions: {
            color: '#3388ff',
            weight: 3,
            fillOpacity: 0.2
          }
        },
        polyline: false,
        circle: false,
        marker: false,
        circlemarker: false
      }
    });
    mapInstance.addControl(drawControl);
    drawControlRef.current = drawControl;

    // Draw event listeners
    mapInstance.on(L.Draw.Event.CREATED, (e: L.DrawEvents.Created) => {
      drawnItems.clearLayers();
      const layer = e.layer;
      
      // Calculate area
      let latlngs: L.LatLng[] = [];
      if (layer instanceof L.Polygon) {
        const latlngsArray = layer.getLatLngs();
        if (latlngsArray && latlngsArray.length > 0) {
          latlngs = latlngsArray[0] as L.LatLng[];
        }
      } else if (layer instanceof L.Rectangle) {
        const bounds = layer.getBounds();
        latlngs = [
          bounds.getSouthWest(),
          bounds.getNorthWest(),
          bounds.getNorthEast(),
          bounds.getSouthEast()
        ];
      } else {
        return;
      }

      if (latlngs.length >= 3) {
        const area = calculateGeodesicArea(latlngs);
        const areaSqKm = (area / 1000000).toFixed(2);
        (layer.options as any).areaSqKm = areaSqKm;
        
        // Store area in a way that's easily accessible
        (layer as any)._areaSqKm = areaSqKm;
        
        layer.bindPopup(`Proposed Area: ${areaSqKm} sq km<br>Status: Ready for Analysis`).openPopup();
        
        // Make layer selectable and highlightable
        layer.setStyle({
          color: '#3388ff',
          weight: 3,
          fillOpacity: 0.2
        });
        
        // Add click handler for selection highlighting
        layer.on('click', function() {
          // Highlight selected layer
          drawnItems.eachLayer((l: any) => {
            if (l === layer) {
              l.setStyle({
                color: '#ff0000',
                weight: 4,
                fillOpacity: 0.3
              });
            } else {
              l.setStyle({
                color: '#3388ff',
                weight: 3,
                fillOpacity: 0.2
              });
            }
          });
        });
      }
      
      drawnItems.addLayer(layer);
      setDrawnLayer(layer);
    });

    mapInstance.on(L.Draw.Event.DELETED, (e: L.DrawEvents.Deleted) => {
      setDrawnLayer(null);
      // Clear all simulated layers when drawn items are deleted
      if (mapRef.current) {
        if (simulatedResultLayerRef.current) {
          mapRef.current.removeLayer(simulatedResultLayerRef.current);
          simulatedResultLayerRef.current = null;
          setSimulatedResultLayer(null);
        }
        if (correlationHeatmapLayerRef.current) {
          mapRef.current.removeLayer(correlationHeatmapLayerRef.current);
          correlationHeatmapLayerRef.current = null;
          setCorrelationHeatmapLayer(null);
        }
      }
    });

    // Handle edit events for better interaction
    mapInstance.on(L.Draw.Event.EDITED, (e: L.DrawEvents.Edited) => {
      const layers = e.layers;
      layers.eachLayer((layer: any) => {
        // Recalculate area after editing
        let latlngs: L.LatLng[] = [];
        if (layer instanceof L.Polygon) {
          const latlngsArray = layer.getLatLngs();
          if (latlngsArray && latlngsArray.length > 0) {
            latlngs = latlngsArray[0] as L.LatLng[];
          }
        } else if (layer instanceof L.Rectangle) {
          const bounds = layer.getBounds();
          latlngs = [
            bounds.getSouthWest(),
            bounds.getNorthWest(),
            bounds.getNorthEast(),
            bounds.getSouthEast()
          ];
        }
        
        if (latlngs.length >= 3) {
          const area = calculateGeodesicArea(latlngs);
          const areaSqKm = (area / 1000000).toFixed(2);
          (layer.options as any).areaSqKm = areaSqKm;
          (layer as any)._areaSqKm = areaSqKm;
          layer.setPopupContent(`Proposed Area: ${areaSqKm} sq km<br>Status: Ready for Analysis`);
        }
      });
    });

    return () => {
      mapInstance.remove();
      setMap(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchBasemap = (key: BasemapType) => {
    if (!mapRef.current) return;
    
    const currentLayer = basemapLayers[currentBasemap];
    if (currentLayer) {
      mapRef.current.removeLayer(currentLayer);
    }
    
    const newLayer = basemapLayers[key];
    if (newLayer) {
      newLayer.addTo(mapRef.current);
      setCurrentBasemap(key);
    }
  };

  const toggleIndexLayer = (index: IndexType, isChecked: boolean) => {
    if (!mapRef.current) return;

    const lilongweBounds: L.LatLngBoundsExpression = [[-14.05, 33.7], [-13.85, 33.9]];
    let color: string;
    let text: string;

    if (index === 'lst') {
      color = '#ef4444';
      text = 'LST (Heat) Coverage';
    } else if (index === 'ndvi') {
      color = '#10b981';
      text = 'NDVI (Vegetation) Coverage';
    } else if (index === 'ndbi') {
      color = '#f59e0b';
      text = 'NDBI (Built-up) Coverage';
    } else if (index === 'lulc') {
      color = '#3b82f6';
      text = 'LULC (Land Cover) Coverage';
    } else {
      return;
    }

    if (isChecked) {
      const newLayer = L.rectangle(lilongweBounds, {
        color: color,
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.05,
        dashArray: '8, 8'
      }).addTo(mapRef.current);
      
      newLayer.bindPopup(`**${text}** (Static Coverage Boundary)`).openPopup();
      
      setCachedIndexLayers(prev => ({
        ...prev,
        [index]: newLayer
      }));
    } else {
      const existingLayer = cachedIndexLayers[index];
      if (existingLayer && mapRef.current) {
        mapRef.current.removeLayer(existingLayer);
        setCachedIndexLayers(prev => ({
          ...prev,
          [index]: null
        }));
      }
    }
  };

  const addUploadedGeoJson = (geojson: GeoJSON.GeoJSON) => {
    if (!mapRef.current) return;

    if (uploadedGeoJsonLayer) {
      mapRef.current.removeLayer(uploadedGeoJsonLayer);
    }

    const layer = L.geoJSON(geojson, {
      style: () => ({
        color: "#8b5cf6",
        weight: 3,
        opacity: 0.8,
        fillOpacity: 0.1,
        dashArray: '5, 5'
      }),
      onEachFeature: (feature, layer) => {
        if (feature.properties) {
          let popupContent = `<strong>Uploaded Feature:</strong><br>`;
          for (const key in feature.properties) {
            if (feature.properties.hasOwnProperty(key)) {
              popupContent += `<strong>${key}:</strong> ${feature.properties[key]}<br>`;
            }
          }
          layer.bindPopup(popupContent);
        }
      }
    }).addTo(mapRef.current);

    mapRef.current.fitBounds(layer.getBounds());
    setUploadedGeoJsonLayer(layer);
  };

  const addSimulatedResultLayer = (bounds: L.LatLngBounds) => {
    if (!mapRef.current) return;

    if (simulatedResultLayerRef.current) {
      mapRef.current.removeLayer(simulatedResultLayerRef.current);
    }

    const layer = L.rectangle(bounds, {
      color: "#10b981",
      weight: 4,
      opacity: 0.8,
      fillOpacity: 0.4,
      dashArray: '8, 4'
    }).addTo(mapRef.current).bindPopup(`Simulated Cooling Potential Area - Output Layer`);

    simulatedResultLayerRef.current = layer;
    setSimulatedResultLayer(layer);
  };

  const addCorrelationHeatmapLayer = (geojson: GeoJSON.GeoJSON) => {
    if (!mapRef.current) return;

    if (correlationHeatmapLayerRef.current) {
      mapRef.current.removeLayer(correlationHeatmapLayerRef.current);
    }

    const layer = L.geoJSON(geojson, {
      style: (feature: any) => ({
        color: feature.properties.color,
        weight: 1,
        opacity: 0.6,
        fillOpacity: 0.5
      }),
      onEachFeature: (feature: any, layer: L.Layer) => {
        layer.bindPopup(`Local Correlation (r): ${feature.properties.r_value.toFixed(2)}`);
      }
    }).addTo(mapRef.current);

    correlationHeatmapLayerRef.current = layer;
    setCorrelationHeatmapLayer(layer);
  };

  return {
    mapContainerRef,
    map: map,
    drawnItems: drawnItemsRef.current,
    drawnLayer,
    switchBasemap,
    toggleIndexLayer,
    addUploadedGeoJson,
    addSimulatedResultLayer,
    addCorrelationHeatmapLayer,
    clearSimulatedLayers: () => {
      if (mapRef.current) {
        if (simulatedResultLayerRef.current) {
          mapRef.current.removeLayer(simulatedResultLayerRef.current);
          simulatedResultLayerRef.current = null;
          setSimulatedResultLayer(null);
        }
        if (correlationHeatmapLayerRef.current) {
          mapRef.current.removeLayer(correlationHeatmapLayerRef.current);
          correlationHeatmapLayerRef.current = null;
          setCorrelationHeatmapLayer(null);
        }
      }
    }
  };
};

