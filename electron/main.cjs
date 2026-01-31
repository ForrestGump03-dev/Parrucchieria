const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

// Helper per i percorsi (gestisce sia dev che prod/asar)
const getAssetPath = (asset) => {
  if (isDev) {
    return path.join(__dirname, '../public', asset);
  }
  // In produzione, i file 'public' vengono copiati nella cartella 'dist'
  return path.join(__dirname, '../dist', asset);
};

let mainWindow = null;
let splashWindow = null;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 300,
    frame: false,            // Niente bordi o barre del titolo
    alwaysOnTop: true,       // Sempre in primo piano
    transparent: true,       // Sfondo trasparente (se supportato)
    resizable: false,
    icon: getAssetPath('logo.png'), // Icona app adattiva
    webPreferences: {
      nodeIntegration: false
    }
  });

  // Splash Path logic
  // In dev: ../public/splash.html
  // In prod: ../dist/splash.html (se vite lo copia, ma vite copia gli assets...)
  // ATTENZIONE: i file .html in public vengono copiati in dist.
  const splashPath = isDev 
     ? path.join(__dirname, '../public/splash.html') 
     : path.join(__dirname, '../dist/splash.html');
     
  splashWindow.loadFile(splashPath);
  
  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function createWindow() {
  // Crea la splash screen prima
  createSplashWindow();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Nascondi inizialmente la finestra principale
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
    icon: getAssetPath('logo.png')
  });

  mainWindow.setMenuBarVisibility(false);

  if (isDev) {
    process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools(); // Opzionale in avvio
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html')).catch(() => {
        // Se c'è errore, mostra devtools
        mainWindow.webContents.openDevTools();
    });
  }

  // Quando la finestra principale è pronta a mostrare qualcosa
  mainWindow.once('ready-to-show', () => {
    // Simula un piccolo ritardo per lasciare vedere il logo (es. 2 secondi)
    setTimeout(() => {
      if (splashWindow) {
        splashWindow.close();
      }
      mainWindow.show();
      mainWindow.focus();
    }, 2500);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    if (url.startsWith('blob:')) {
       return { action: 'allow' };
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
      // Monitoraggio download per ripristinare il focus
      item.once('done', (event, state) => {
          // Quando il download finisce o viene annullato (dialog chiuso)
          if (mainWindow) {
              mainWindow.show();
              mainWindow.focus();
          }
      });
  });
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Imposta l'ID applicazione per Windows (aiuta con raggruppamento icone e taskbar)
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.root.manager');
  }

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
