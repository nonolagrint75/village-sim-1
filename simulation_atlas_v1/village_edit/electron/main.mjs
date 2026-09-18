import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Isolate cache/profile from old Downloads / other village_edit copies
// (they all used to share AppData\Roaming\village-sim-local).
app.setPath('userData', path.join(app.getPath('appData'), 'simulation-atlas-v1'))

app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-background-timer-throttling')
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')

const WINDOW_TITLE = 'Simulation Atlas v1'

function createWindow() {
  const win = new BrowserWindow({
    width: 1480,
    height: 940,
    minWidth: 980,
    minHeight: 720,
    backgroundColor: '#f3f6f2',
    autoHideMenuBar: true,
    title: WINDOW_TITLE,
    webPreferences: {
      backgroundThrottling: false,
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  win.on('page-title-updated', (e) => {
    e.preventDefault()
    win.setTitle(WINDOW_TITLE)
  })

  if (!app.isPackaged) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL ?? 'http://127.0.0.1:5174')
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
