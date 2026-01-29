const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Disabilita CORS per permettere le chiamate a Supabase da file://
    },
    icon: path.join(__dirname, '../public/favicon.ico') // Assicurati di avere un'icona
  });

  // Rimuovi il menu standard (File, Edit, ecc.) per un look più "App"
  mainWindow.setMenuBarVisibility(false);

  if (isDev) {
    // Disabilita il warning di sicurezza in console (solo in dev, causato da Vite)
    process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
    
    // In sviluppo, carica l'URL di Vite
    mainWindow.loadURL('http://localhost:5173');
    // Apre i DevTools automaticamente
    mainWindow.webContents.openDevTools();
  } else {
    // In produzione o fallback, carica il file
    // Se fallisce il caricamento del file (es. build mancante), apriamo i devtools per vedere l'errore
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html')).catch(() => {
        mainWindow.webContents.openDevTools();
    });
  }

  // Apri i link esterni nel browser predefinito, non nell'app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
