import L from 'leaflet';

// Fix for default marker icons in React/TypeScript
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export const calculateGeodesicArea = (latlngs: L.LatLng[]): number => {
  // Improved geodesic area calculation using spherical excess formula
  if (latlngs.length < 3) return 0;
  
  const R = 6378137; // Earth's radius in meters
  let area = 0;
  
  for (let i = 0; i < latlngs.length; i++) {
    const j = (i + 1) % latlngs.length;
    const lat1 = latlngs[i].lat * Math.PI / 180;
    const lat2 = latlngs[j].lat * Math.PI / 180;
    const dLng = (latlngs[j].lng - latlngs[i].lng) * Math.PI / 180;
    
    area += dLng * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  
  area = Math.abs(area * R * R / 2);
  
  // Ensure we have a valid area
  if (isNaN(area) || area <= 0) {
    // Fallback: simple planar calculation for small areas
    let planarArea = 0;
    for (let i = 0; i < latlngs.length; i++) {
      const j = (i + 1) % latlngs.length;
      planarArea += latlngs[i].lng * latlngs[j].lat;
      planarArea -= latlngs[j].lng * latlngs[i].lat;
    }
    planarArea = Math.abs(planarArea) / 2;
    // Convert to square meters (approximate)
    const avgLat = latlngs.reduce((sum, ll) => sum + ll.lat, 0) / latlngs.length;
    const latRad = avgLat * Math.PI / 180;
    const latCorrection = Math.cos(latRad);
    const metersPerDegree = 111320 * latCorrection;
    area = planarArea * metersPerDegree * metersPerDegree;
  }
  
  return area;
};

export const downloadFile = (content: string, fileName: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

