let { app, BrowserWindow, ipcMain } = require('electron/main');
let { spawn } = require('child_process');
let { fileURLToPath } = require('url');
let path = require('path');

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
	webPreferences: { 
		devTools: true,
		nodeIntegration: true,
		contextIsolation: false
	}
  });
  win.resizable = false;
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
});

ipcMain.on('spawn-process', (event, arg) => {
  // Spawning a new Node.js process
  const child = spawn('node', [path.join(__dirname, 'run-script.js'), ...arg], { stdio: "inherit" });
  child.on('exit', (code) => {
    event.sender.send('finished-write');
  });
});