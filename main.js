'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const { runGift } = require('./src/getGift');
const { testAuth } = require('./src/testAuth');
const { CONFIG_PATH } = require('./src/utils');

let mainWindow = null;

function createWindow() {
  // Pick an icon that actually exists for the current platform.
  const iconCandidates = ['app-icon.png', 'app-icon.ico', 'icon.png', 'icon.ico'];
  const iconPath = iconCandidates
    .map(name => path.join(__dirname, name))
    .find(p => fs.existsSync(p));

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    ...(iconPath ? { icon: iconPath } : {}),
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  // mainWindow.webContents.openDevTools(); // development only
}

app.whenReady().then(() => {
  createWindow();

  // macOS: re-create a window when the dock icon is clicked and none are open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit on all platforms except macOS, where apps stay alive until Cmd+Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/** Stream a line to the renderer, guarding against a destroyed window. */
function sendOutput(channel, line) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, line);
  }
}

ipcMain.handle('saveConfig', async (_event, users) => {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(users, null, 2));
    return { success: true, message: 'Configurație salvată cu succes!' };
  } catch (error) {
    console.error('Error saving config:', error);
    return { success: false, message: `Eroare la salvarea configurației: ${error.message}` };
  }
});

ipcMain.handle('loadConfig', async () => {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      return { success: true, data: JSON.parse(data) };
    }
    return { success: true, data: [] };
  } catch (error) {
    console.error('Error loading config:', error);
    return { success: false, message: `Eroare la încărcarea configurației: ${error.message}` };
  }
});

ipcMain.handle('testAuthentication', async (_event, user) => {
  try {
    const result = await testAuth({
      user,
      logger: line => sendOutput('scriptOutput', line),
    });
    sendOutput('scriptOutput', 'Testare finalizată.');
    return result;
  } catch (error) {
    sendOutput('scriptError', error.message);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('runScript', async () => {
  try {
    const { failed } = await runGift({
      logger: line => sendOutput('scriptOutput', line),
    });
    return { success: failed === 0 };
  } catch (error) {
    sendOutput('scriptError', error.message);
    return { success: false, message: error.message };
  }
});
