let { app, BrowserWindow, ipcMain } = require('electron/main');
let { fork } = require('child_process');
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
  win.removeMenu();
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
  console.log('spawn process called', arg);
  const child = fork(path.join(__dirname, 'run-script.js'), arg, { silent: true });
  let out = ``;
  child.stderr.on('data', (msg) => {
    console.log(`Error message from child: ${msg}`);
    event.sender.send('output-child', msg)
  });
  child.on('exit', (code) => {
    console.log(`exited with code ${code}`);
    event.sender.send('finished-write', code);
  });
});