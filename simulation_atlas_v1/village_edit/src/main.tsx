import { createRoot } from 'react-dom/client'
import './styles.css'
import { SimulationCanvas } from './components/SimulationCanvas'

createRoot(document.getElementById('root')!).render(<SimulationCanvas />)
