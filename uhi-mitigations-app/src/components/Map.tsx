import { useRef } from 'react';

interface MapProps {
  mapContainerRef: React.RefObject<HTMLDivElement>;
}

export const Map = ({ mapContainerRef }: MapProps) => {
  return <div id="map" ref={mapContainerRef} style={{ height: '100vh', width: '100%' }} />;
};

