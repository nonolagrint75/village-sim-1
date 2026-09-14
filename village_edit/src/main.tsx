import { createRoot } from 'react-dom/client'
import './styles.css'
import { SimulationCanvas } from './components/SimulationCanvas'

createRoot(document.getElementById('root')!).render(
  <div style={{ padding: 24, minHeight: '100vh', background: '#f3f6f2' }}>
    <SimulationCanvas />
  </div>,
)
