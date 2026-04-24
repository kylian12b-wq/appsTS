const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const isDev = !app.isPackaged;
const coursesDir = isDev
  ? __dirname
  : path.join(process.resourcesPath, 'courses');

const NAME_MAP = {
  'Excel_Partie1_BTS_ERA.html': 'Excel \u2013 Partie 1 BTS ERA',
  'bts-era-guide-complet.html': 'Guide Complet BTS ERA',
  'commercial-organisation-personnelle.html': 'Organisation Personnelle Commerciale',
  'cours dossier cours.HTML': 'Dossier de Cours',
  'cours.html': 'Cours Principal',
  'cours-acoustique-re2020.html': 'Acoustique & RE2020',
  'cours-budget-client-reception.html': 'Budget Client & R\u00e9ception',
  'cours-chiffrage-devis.html': 'Chiffrage & Devis',
  'cours-colles-finitions-cotes.html': 'Colles, Finitions & C\u00f4tes',
  'cours-dtu-securite-chantier.html': 'DTU & S\u00e9curit\u00e9 Chantier',
  'cours-panneaux-bois.html': 'Panneaux Bois',
  'cours-pmr-incendie-erp.html': 'PMR, Incendie & ERP',
  'cours-preparation-suivi-chantier.html': 'Pr\u00e9paration & Suivi Chantier',
  'documents-chantier-appels-offres.html': "Documents Chantier & Appels d'Offres",
  'documents-conception-contractuels.html': 'Documents de Conception Contractuels',
  'management-equipe.html': "Management d'\u00c9quipe",
  'menuiserie_formation.html': 'Formation Menuiserie',
  'methode-revision-simulations.html': 'M\u00e9thodes de R\u00e9vision & Simulations',
  'module1-partie2-word.html': 'Module 1 \u2013 Word (Partie 2)',
  'module1-partie3-raccourcis.html': 'Module 1 \u2013 Raccourcis Clavier (Partie 3)',
  'module2-partie3-assemblages.html': 'Module 2 \u2013 Assemblages (Partie 3)',
  'module2-partie4-quincaillerie.html': 'Module 2 \u2013 Quincaillerie (Partie 4)',
  'partie6-7-calepinage-ia.html': 'Calepinage & IA (Parties 6-7)',
};

function formatName(filename) {
  return NAME_MAP[filename]
    || filename.replace(/\.[Hh][Tt][Mm][Ll]?$/, '').replace(/[-_]/g, ' ');
}

function categorizeFile(filename) {
  const n = filename.toLowerCase();
  if (/excel|module1|word|raccourci/.test(n)) return 'Informatique';
  if (/menuiserie|bois|assemblage|quincaillerie|calepinage|module2/.test(n)) return 'Menuiserie & Bois';
  if (/chantier|dtu|securite|appel|preparation|suivi/.test(n)) return 'Chantier & DTU';
  if (/devis|budget|commercial|reception/.test(n)) return 'Commercial & Devis';
  if (/acoustique|re2020|pmr|incendie|erp/.test(n)) return 'R\u00e9glementation';
  if (/conception|contractuel|colle|finition/.test(n)) return 'Documents & Conception';
  if (/management|organisation/.test(n)) return 'Management';
  if (/guide|revision|methode|simulation/.test(n)) return 'R\u00e9vision & M\u00e9thodes';
  return 'Cours G\u00e9n\u00e9raux';
}

function getHtmlFiles() {
  try {
    return fs.readdirSync(coursesDir)
      .filter(f => /\.html?$/i.test(f))
      .map(f => {
        const filePath = path.join(coursesDir, f);
        const stat = fs.statSync(filePath);
        return {
          filename: f,
          displayName: formatName(f),
          category: categorizeFile(f),
          size: stat.size,
          fileUrl: pathToFileURL(filePath).href,
          modified: stat.mtime,
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr'));
  } catch (err) {
    console.error('Error reading courses directory:', err);
    return [];
  }
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0d0d1a',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'app', 'index.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  mainWindow.on('maximize', () =>
    mainWindow.webContents.send('window-state', 'maximized')
  );
  mainWindow.on('unmaximize', () =>
    mainWindow.webContents.send('window-state', 'normal')
  );
}

function blockGoogleFonts(sess) {
  sess.webRequest.onBeforeRequest(
    { urls: ['*://fonts.googleapis.com/*', '*://fonts.gstatic.com/*'] },
    (details, callback) => callback({ cancel: true })
  );
}

app.whenReady().then(() => {
  blockGoogleFonts(session.defaultSession);
  blockGoogleFonts(session.fromPartition('persist:courses'));
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('get-html-files', () => getHtmlFiles());
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.on('window-close', () => mainWindow?.close());
