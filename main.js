const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'icon.ico'),
  });

  mainWindow.loadFile('index.html');

  // For development only
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('saveConfig', async (event, users) => {
  try {
    fs.writeFileSync('config.json', JSON.stringify(users, null, 2));
    return { success: true, message: 'Configurație salvată cu succes!' };
  } catch (error) {
    console.error('Error saving config:', error);
    return { success: false, message: 'Eroare la salvarea configurației: ' + error.message };
  }
});

ipcMain.handle('loadConfig', async event => {
  try {
    if (fs.existsSync('config.json')) {
      const data = fs.readFileSync('config.json', 'utf8');
      const users = JSON.parse(data);
      return { success: true, data: users };
    }
    return { success: true, data: [] };
  } catch (error) {
    console.error('Error loading config:', error);
    return { success: false, message: 'Eroare la încărcarea configurației: ' + error.message };
  }
});

ipcMain.handle('testAuthentication', async (event, user) => {
  return new Promise(resolve => {
    // Create a temporary file with the single user to test
    const tempUserFile = 'temp_user_test.json';
    fs.writeFileSync(tempUserFile, JSON.stringify([user], null, 2));

    const scriptProcess = spawn('node', ['testAuth.js', tempUserFile]);
    let result = { success: false, message: 'Nu s-a primit niciun răspuns de la script.' };
    let outputData = '';

    scriptProcess.stdout.on('data', data => {
      const output = data.toString().trim();
      outputData += output + '\n';
      mainWindow.webContents.send('scriptOutput', output);
    });

    scriptProcess.stderr.on('data', data => {
      const output = data.toString().trim();
      mainWindow.webContents.send('scriptError', output);

      // Update result based on error message
      result.success = false;
      result.message = output;
    });

    scriptProcess.on('close', code => {
      mainWindow.webContents.send('scriptOutput', `Testare finalizată cu codul ${code}`);

      // Clean up the temporary file
      try {
        fs.unlinkSync(tempUserFile);
      } catch (error) {
        console.error('Error removing temp file:', error);
      }

      // Determine success based on output and exit code
      if (code === 0 && outputData.includes('Autentificare reușită')) {
        result.success = true;
        result.message = `Autentificare reușită pentru utilizatorul: ${user.username}`;
      } else if (outputData.includes('Autentificare eșuată')) {
        result.success = false;
        // Extract error message from output
        const errorMatch = outputData.match(/Autentificare eșuată[^:]*(.*)/);
        result.message = errorMatch
          ? errorMatch[0]
          : `Autentificare eșuată pentru utilizatorul: ${user.username}`;
      }

      resolve(result);
    });
  });
});

ipcMain.handle('runScript', async event => {
  return new Promise(resolve => {
    const scriptProcess = spawn('node', ['getGift.js']);

    scriptProcess.stdout.on('data', data => {
      const output = data.toString().trim();
      mainWindow.webContents.send('scriptOutput', output);
    });

    scriptProcess.stderr.on('data', data => {
      const output = data.toString().trim();
      mainWindow.webContents.send('scriptError', output);
    });

    scriptProcess.on('close', code => {
      mainWindow.webContents.send('scriptOutput', `Process exited with code ${code}`);
      resolve({ success: code === 0 });
    });
  });
});

// Forward messages from the renderer to the main window
ipcMain.on('scriptOutput', (event, data) => {
  mainWindow.webContents.send('scriptOutput', data);
});

ipcMain.on('scriptError', (event, data) => {
  mainWindow.webContents.send('scriptError', data);
});
