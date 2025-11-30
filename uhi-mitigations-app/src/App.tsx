import { useRef } from 'react';
import { Map } from './components/Map';
import { ControlPanel } from './components/ControlPanel';
import { useMap } from './hooks/useMap';
import { MapProvider } from './context/MapContext';
import './styles.css';

function App() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapContext = useMap(mapContainerRef);

  return (
    <MapProvider value={mapContext}>
      <div className="bg-gray-50 font-sans relative">
        <Map mapContainerRef={mapContainerRef} />
        <ControlPanel />
      </div>
    </MapProvider>
  );
}

export default App;

