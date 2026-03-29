const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');

let mainWindow;
let backendProcess;
let joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '0.0.0.0';
}


function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 500,
        icon: path.join(__dirname, 'icon.png'),
        frame: false, // Borderless modern window
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Load Vite dev server if in development, otherwise load built file
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    }

    // Handle IPC calls for custom titlebar
    ipcMain.on('minimize-window', () => mainWindow.minimize());
    ipcMain.on('maximize-window', () => {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    });
    ipcMain.on('close-window', () => mainWindow.close());
    ipcMain.handle('get-server-info', async () => {
        return {
            host: getLocalIp(),
            port: 3000,
            joinCode: joinCode
        };
    });
}

function startBackend() {
    const serverPath = path.join(__dirname, 'backend', 'server.js');
    const { utilityProcess } = require('electron');

    backendProcess = utilityProcess.fork(serverPath, [], { stdio: 'pipe' });

    backendProcess.on('spawn', () => {
        console.log('[Backend] utilityProcess spawned successfully.');
    });

    if (backendProcess.stdout) {
        backendProcess.stdout.on('data', (data) => {
            console.log(`[Backend] ${data}`);
        });
    }

    if (backendProcess.stderr) {
        backendProcess.stderr.on('data', (data) => {
            console.error(`[Backend] ${data}`);
        });
    }
}

app.whenReady().then(() => {
    startBackend();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    if (backendProcess) {
        backendProcess.kill();
    }
});
