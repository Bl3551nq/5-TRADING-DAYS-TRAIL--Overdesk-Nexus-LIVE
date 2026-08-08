const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
const { autoUpdater } = require('electron-updater');

// Keep variables in higher scope to prevent garbage collection
let mainWindow = null;
let tray = null;
let isQuitting = false;
let cachedX = null;
let cachedY = null;
let cachedScale = null;
let configCache = null;
let isProgrammaticBoundsUpdate = false;
let programmaticTimeout = null;
let isScaling = false;
let scaleCenterX = null;
let scaleCenterY = null;
let lastTargetW = null;
let lastTargetH = null;
const configPath = path.join(app.getPath('userData'), 'app-config.json');

// Helper to read config
function readConfig() {
  if (configCache) return configCache;
  try {
    if (fs.existsSync(configPath)) {
      configCache = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return configCache;
    }
  } catch (err) {
    console.error('Error reading config:', err);
  }
  configCache = {};
  return configCache;
}

// Helper to write config
let writeTimeout = null;
function writeConfig(data) {
  try {
    const current = readConfig();
    configCache = { ...current, ...data };
    
    if (writeTimeout) clearTimeout(writeTimeout);
    writeTimeout = setTimeout(() => {
      try {
        fs.writeFileSync(configPath, JSON.stringify(configCache, null, 2), 'utf8');
      } catch (err) {
        console.error('Error writing config:', err);
      }
    }, 500); // 500ms debounce
  } catch (err) {
    console.error('Error in writeConfig queue:', err);
  }
}

function createWindow() {
  const config = readConfig();
  const savedScale = config.scale || 1.0;
  cachedScale = savedScale;
  
  // Custom sizing math fitting our card size (320px width initially)
  const initialWidth = Math.round((320 + 140) * savedScale);
  const initialHeight = Math.round((480 + 200) * savedScale);

  lastTargetW = initialWidth;
  lastTargetH = initialHeight;

  const windowOptions = {
    width: initialWidth,
    height: initialHeight,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: true, // Set to true to bypass OS/Win32 boundary positioning restrictions
    maximizable: false, // Prevent maximize behavior to sustain checklist aspect ratio
    alwaysOnTop: true,
    skipTaskbar: false,
    show: !process.argv.includes('--hidden') && !process.argv.includes('-h'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false // Ensure timers & audio keep running when window is minimized/hidden
    }
  };

  // Restore saved coordinates if loaded correctly
  if (typeof config.x === 'number' && typeof config.y === 'number') {
    windowOptions.x = config.x;
    windowOptions.y = config.y;
    cachedX = config.x;
    cachedY = config.y;
  }

  // Load appropriate application icon
  const customIconPath = path.join(app.getPath('userData'), 'icon.png');
  const packagedIconPath = path.join(__dirname, 'icon.png');
  if (fs.existsSync(customIconPath)) {
    windowOptions.icon = customIconPath;
  } else if (fs.existsSync(packagedIconPath)) {
    windowOptions.icon = packagedIconPath;
  }

  mainWindow = new BrowserWindow(windowOptions);

  // Load from local static build or development server
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // Open DevTools in dev mode if needed for debugging
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Save coordinates when window moves (only if NOT programmatic resize/drag scale)
  let moveTimeout;
  mainWindow.on('move', () => {
    if (isProgrammaticBoundsUpdate || isScaling) return;
    if (mainWindow) {
      const [x, y] = mainWindow.getPosition();
      cachedX = x;
      cachedY = y;
    }
    if (moveTimeout) clearTimeout(moveTimeout);
    moveTimeout = setTimeout(() => {
      if (isProgrammaticBoundsUpdate || isScaling) return;
      if (mainWindow) {
        const [x, y] = mainWindow.getPosition();
        cachedX = x;
        cachedY = y;
        writeConfig({ x, y });
      }
    }, 300);
  });

  // Handle OS/Screen sleep/wake-initiated window crushing or display change resizing
  mainWindow.on('resize', () => {
    if (isProgrammaticBoundsUpdate || isScaling) return;
    if (mainWindow && lastTargetW && lastTargetH) {
      const [w, h] = mainWindow.getSize();
      if (w !== lastTargetW || h !== lastTargetH) {
        isProgrammaticBoundsUpdate = true;
        mainWindow.setSize(lastTargetW, lastTargetH);
        setTimeout(() => {
          isProgrammaticBoundsUpdate = false;
        }, 300);
      }
    }
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Check for auto updates once window displays
  mainWindow.once('ready-to-show', () => {
    if (!isDev) {
      autoUpdater.checkForUpdatesAndNotify().catch(err => {
        console.error('Error checking for updates:', err);
      });
    }
  });
}

function createTray() {
  const customIconPath = path.join(app.getPath('userData'), 'icon.png');
  const packagedIconPath = path.join(__dirname, 'icon.png');
  let iconPath = packagedIconPath;

  if (fs.existsSync(customIconPath)) {
    iconPath = customIconPath;
  }

  let trayIcon;
  if (fs.existsSync(iconPath)) {
    // Windows supports 32x32 or 48x48 for High-DPI screens. macOS standard size is 16x16 with optional template styling.
    if (process.platform === 'win32') {
      trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 32, height: 32, quality: 'best' });
    } else if (process.platform === 'darwin') {
      trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16, quality: 'best' });
      trayIcon.setTemplateImage(true);
    } else {
      trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 24, height: 24, quality: 'best' });
    }
  } else {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show/Hide App',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
            mainWindow.focus();
          }
        } else {
          createWindow();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Overdesk Nexus');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      createWindow();
    }
  });
}

// Ensure isQuitting is set to true when app is quitting (e.g. via autoUpdater or OS shutdown)
app.on('before-quit', () => {
  isQuitting = true;
});

// Configure autoUpdater
let isUpdateDownloaded = false;
let userRequestedInstall = false;

autoUpdater.on('update-available', (info) => {
  isUpdateDownloaded = false;
  if (mainWindow) {
    mainWindow.webContents.send('update-available', info.version);
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow) {
    mainWindow.webContents.send('download-progress', Math.round(progressObj.percent));
  }
});

autoUpdater.on('update-downloaded', () => {
  isUpdateDownloaded = true;
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded');
  }
  if (userRequestedInstall) {
    isQuitting = true;
    autoUpdater.quitAndInstall(false, true);
  }
});

autoUpdater.on('error', (err) => {
  console.error('AutoUpdater error:', err);
  if (mainWindow) {
    let cleanMessage = 'Update failed to download. Please check back later.';
    const rawMsg = err ? (err.message || String(err)) : '';
    if (rawMsg.includes('404') || rawMsg.includes('releases/download') || rawMsg.includes('github.com')) {
      cleanMessage = 'Update package file not found on GitHub release (404). Check release asset filename.';
    } else if (rawMsg.includes('net::ERR_') || rawMsg.includes('ENOTFOUND')) {
      cleanMessage = 'Network connection error while downloading update.';
    }
    mainWindow.webContents.send('update-error', cleanMessage);
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();

  // Configure Launch on Startup (Auto-launch hidden in tray)
  try {
    if (app.isPackaged) {
      app.setLoginItemSettings({
        openAtLogin: true,
        path: app.getPath('exe'),
        args: ['--hidden']
      });
    }
  } catch (err) {
    console.error('Failed to configure launch on startup:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Handle display changes (e.g. monitors unplugged/replugged or screen resolution/DPI transitions)
  screen.on('display-metrics-changed', () => {
    if (mainWindow && lastTargetW && lastTargetH) {
      isProgrammaticBoundsUpdate = true;
      mainWindow.setSize(lastTargetW, lastTargetH);
      const config = readConfig();
      if (typeof config.x === 'number' && typeof config.y === 'number') {
        mainWindow.setPosition(config.x, config.y);
      }
      setTimeout(() => {
        isProgrammaticBoundsUpdate = false;
      }, 500);
    }
  });

  screen.on('display-removed', () => {
    if (mainWindow && lastTargetW && lastTargetH) {
      isProgrammaticBoundsUpdate = true;
      mainWindow.setSize(lastTargetW, lastTargetH);
      const config = readConfig();
      if (typeof config.x === 'number' && typeof config.y === 'number') {
        mainWindow.setPosition(config.x, config.y);
      }
      setTimeout(() => {
        isProgrammaticBoundsUpdate = false;
      }, 500);
    }
  });

  screen.on('display-added', () => {
    if (mainWindow && lastTargetW && lastTargetH) {
      isProgrammaticBoundsUpdate = true;
      mainWindow.setSize(lastTargetW, lastTargetH);
      const config = readConfig();
      if (typeof config.x === 'number' && typeof config.y === 'number') {
        mainWindow.setPosition(config.x, config.y);
      }
      setTimeout(() => {
        isProgrammaticBoundsUpdate = false;
      }, 500);
    }
  });
});

app.on('window-all-closed', () => {
  // Keep the app process alive in the system tray area
});

/* ═══════════════════════════════════════════════════════
   IPC HANDLERS (License Validation & Window Controls)
═══════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════
   5-DAY PERSISTENT HARDWARE & IP TRIAL ENGINE
═══════════════════════════════════════════════════════ */

const SYS_TRIAL_FILE = path.join(os.homedir(), '.overdesk_nexus_sys.dat');

function getLocalIpAddress() {
  try {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
      const iface = interfaces[devName];
      if (!iface) continue;
      for (let i = 0; i < iface.length; i++) {
        const alias = iface[i];
        if (alias.family === 'IPv4' && !alias.internal) {
          return alias.address;
        }
      }
    }
  } catch (e) {}
  return '127.0.0.1';
}

function getSystemTrialRecord() {
  const machineId = getMachineId();
  const currentIp = getLocalIpAddress();
  let trialRecord = null;

  // 1. Check hidden system file in home directory (survives cache clears & uninstalls)
  try {
    if (fs.existsSync(SYS_TRIAL_FILE)) {
      const content = fs.readFileSync(SYS_TRIAL_FILE, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed.trialStartDate === 'number') {
        trialRecord = parsed;
      }
    }
  } catch (err) {
    console.error('Error reading system trial file:', err);
  }

  // 2. Check app-config.json
  const config = readConfig();
  if (config.trialRecord && typeof config.trialRecord.trialStartDate === 'number') {
    if (!trialRecord || config.trialRecord.trialStartDate < trialRecord.trialStartDate) {
      trialRecord = config.trialRecord;
    }
  }

  // 3. Create new persistent trial record if none exists anywhere
  if (!trialRecord) {
    trialRecord = {
      trialStartDate: Date.now(),
      machineId,
      firstIp: currentIp,
      created: new Date().toISOString()
    };
  }

  trialRecord.machineId = trialRecord.machineId || machineId;
  trialRecord.firstIp = trialRecord.firstIp || currentIp;

  // Sync back to both locations
  try {
    fs.writeFileSync(SYS_TRIAL_FILE, JSON.stringify(trialRecord, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing system trial file:', err);
  }

  if (!config.trialRecord || JSON.stringify(config.trialRecord) !== JSON.stringify(trialRecord)) {
    writeConfig({ trialRecord });
  }

  return trialRecord;
}

// Check license and trial status
ipcMain.handle('check-license', (event, simDay) => {
  const config = readConfig();
  const encrypted = readEncryptedLicense();
  const sysTrial = getSystemTrialRecord();

  const isActivated = config.licenseValid || (encrypted && encrypted.licenseKey) || sysTrial.licenseValid;
  const savedPlanType = config.planType || encrypted?.planType || sysTrial.planType || 'lifetime';
  const savedVariantName = config.variantName || encrypted?.variantName || sysTrial.variantName || (savedPlanType === 'annual' ? 'Annual Subscription' : 'Lifetime Access');

  // If key activated
  if (isActivated) {
    return {
      ok: true,
      isTrial: false,
      licenseValid: true,
      planType: savedPlanType,
      variantName: savedVariantName,
      key: config.licenseKey || encrypted?.licenseKey || sysTrial.licenseKey
    };
  }

  // Retrieve persistent hardware trial record
  const trial = sysTrial;
  let now = Date.now();

  // Simulated day override support for developer testing
  if (typeof simDay === 'number' && simDay >= 1) {
    now = trial.trialStartDate + (simDay - 1) * 24 * 60 * 60 * 1000 + 1000;
  }

  const elapsedMs = Math.max(0, now - trial.trialStartDate);
  const elapsedDaysDecimal = elapsedMs / (1000 * 60 * 60 * 24);
  const isExpired = elapsedDaysDecimal >= 5;

  // Calculate day number (1 to 5, or 6 if expired)
  const dayNumber = isExpired ? 6 : Math.min(5, Math.floor(elapsedDaysDecimal) + 1);
  const daysLeft = isExpired ? 0 : Math.max(0, Math.ceil(5 - elapsedDaysDecimal));
  const hoursLeft = isExpired ? 0 : Math.max(0, Math.ceil((5 * 24) - (elapsedMs / (1000 * 60 * 60))));

  return {
    ok: !isExpired,
    isTrial: true,
    licenseValid: false,
    trialExpired: isExpired,
    dayNumber,
    daysLeft,
    hoursLeft,
    trialStartDate: trial.trialStartDate,
    machineId: trial.machineId,
    ip: trial.firstIp
  };
});

// Gumroad License verify
function getMachineId() {
  try {
    const cpuModel = (os.cpus() && os.cpus().length > 0) ? os.cpus()[0].model : 'unknown-cpu';
    const raw = [
      String(os.hostname() || 'unknown-host'),
      String(os.platform() || 'unknown-platform'),
      String(os.arch() || 'unknown-arch'),
      String(cpuModel),
      String(os.totalmem() || '0'),
    ].join('|');
    return crypto.createHash('sha256').update(raw).digest('hex');
  } catch (e) {
    return crypto.createHash('sha256').update('fallback-machine-id').digest('hex');
  }
}

const ENCRYPTION_KEY = crypto.createHash('sha256').update('OverdeskNexusLicenseSalt2026').digest();

function writeEncryptedLicense(licenseKey, machineId, planType = 'lifetime', variantName = 'Lifetime Access') {
  try {
    const data = JSON.stringify({ licenseKey, machineId, planType, variantName });
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const licenseFilePath = path.join(app.getPath('userData'), 'license.enc');
    fs.writeFileSync(licenseFilePath, JSON.stringify({ iv: iv.toString('hex'), data: encrypted }), 'utf8');
  } catch (err) {
    console.error('Error writing encrypted license:', err);
  }
}

function readEncryptedLicense() {
  try {
    const licenseFilePath = path.join(app.getPath('userData'), 'license.enc');
    if (!fs.existsSync(licenseFilePath)) return null;
    const { iv, data } = JSON.parse(fs.readFileSync(licenseFilePath, 'utf8'));
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (err) {
    console.error('Error reading encrypted license:', err);
    return null;
  }
}

ipcMain.handle('validate-license', async (event, rawKey) => {
  const licenseKey = rawKey.trim();
  const normalizedKey = licenseKey.toUpperCase();

  const currentMachineId = getMachineId();
  const storedLicense = readEncryptedLicense();
  const alreadyActivatedThisMachine = storedLicense && 
    storedLicense.licenseKey.toUpperCase() === licenseKey.toUpperCase() && 
    storedLicense.machineId === currentMachineId;
  
  // Always call Gumroad with increment_uses_count: false after the first activation so the count stays at 1 and is only used as a flag
  const incrementUsesCount = !alreadyActivatedThisMachine;

  // Attempt to load Gumroad config from package.json dynamically so developers can override without editing code
  let productId = 'ILe-vFDDL-fYyDeKroOQXw==';
  let accessToken = '';
  let usePermalink = false;

  try {
    const pkgPath = path.join(__dirname, '../package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.gumroad) {
        if (pkg.gumroad.product_id) {
          productId = pkg.gumroad.product_id;
          usePermalink = false;
        } else if (pkg.gumroad.product_permalink) {
          productId = pkg.gumroad.product_permalink;
          usePermalink = true;
        }
        if (pkg.gumroad.access_token !== undefined) {
          accessToken = pkg.gumroad.access_token;
        }
      }
    }
  } catch (pkgErr) {
    console.error('Error reading package.json for Gumroad configuration, using defaults:', pkgErr);
  }

  // Gumroad API can be sensitive to content-types. We try URL-encoded first and fall back to JSON.
  try {
    const params = new URLSearchParams();
    params.append('license_key', licenseKey);
    params.append('increment_uses_count', incrementUsesCount ? 'true' : 'false');
    if (usePermalink) {
      params.append('product_permalink', productId);
    } else {
      params.append('product_id', productId);
    }
    if (accessToken) {
      params.append('access_token', accessToken);
    }

    console.log(`Verifying license with Gumroad URL-encoded API. Product ID: ${productId}`);
    let response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params.toString()
    });

    let data = {};
    try {
      data = await response.json();
    } catch (jsonErr) {
      console.error('Failed to parse Gumroad response as JSON, trying text:', jsonErr);
    }

    console.log('Gumroad direct response state:', response.status, data);

    if (!response.ok || !data.success) {
      // Fallback to JSON payload
      const requestBody = {
        license_key: licenseKey,
        increment_uses_count: incrementUsesCount
      };
      if (usePermalink) {
        requestBody.product_permalink = productId;
      } else {
        requestBody.product_id = productId;
      }
      if (accessToken) {
        requestBody.access_token = accessToken;
      }

      console.log('Trying JSON fallback verification...');
      const fallbackResponse = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        console.log('Gumroad JSON response:', fallbackResponse.status, fallbackData);
        data = fallbackData;
      }
    }

    if (data && data.success && !data.uses_count_over_limit) {
      if (data.purchase && data.purchase.refunded === true) {
        return { ok: false, error: 'This license has been refunded and is no longer valid.' };
      }

      const uses = (data.uses !== undefined ? data.uses : (data.purchase && data.purchase.uses)) || 0;
      const storedMachineId = storedLicense ? storedLicense.machineId : null;

      if (uses > 1 && storedMachineId !== currentMachineId) {
        return { ok: false, error: 'This license key is already activated on another device. Contact support to transfer.' };
      }

      if (uses === 1 || storedMachineId === currentMachineId) {
        // Extract plan variant (Annual Subscription vs Lifetime Access)
        const rawVariant = (data.purchase && (data.purchase.variant_name || data.purchase.option || (data.purchase.variants && Object.values(data.purchase.variants).join(' ')))) || '';
        const isAnnual = rawVariant.toLowerCase().includes('annual') || rawVariant.toLowerCase().includes('year') || rawVariant.toLowerCase().includes('subscription') || Boolean(data.purchase && data.purchase.subscription_id);
        const planType = isAnnual ? 'annual' : 'lifetime';
        const variantName = rawVariant || (isAnnual ? 'Annual Subscription (1 Year)' : 'Lifetime Access');

        // Check if subscription has ended or cancelled
        if (isAnnual && data.purchase && (data.purchase.subscription_ended_at || data.purchase.subscription_cancelled_at)) {
          const endDateStr = data.purchase.subscription_ended_at || data.purchase.subscription_cancelled_at;
          const endDate = new Date(endDateStr).getTime();
          if (endDate < Date.now()) {
            return { ok: false, error: 'Your annual subscription has ended. Please renew on Gumroad.' };
          }
        }

        writeEncryptedLicense(licenseKey, currentMachineId, planType, variantName);
        writeConfig({ licenseValid: true, licenseKey, planType, variantName });
        try {
          const sysTrial = getSystemTrialRecord();
          sysTrial.licenseValid = true;
          sysTrial.licenseKey = licenseKey;
          sysTrial.planType = planType;
          sysTrial.variantName = variantName;
          fs.writeFileSync(SYS_TRIAL_FILE, JSON.stringify(sysTrial, null, 2), 'utf8');
        } catch (e) {}
        return { ok: true, planType, variantName };
      }
    }

    return { ok: false, error: "Invalid Key, get key from Gumroad" };

  } catch (err) {
    console.error('Gumroad fetch error:', err);
    return { ok: false, error: "Invalid Key, get key from Gumroad" };
  }
});

// Dynamic click-through/ignore-mouse-events handling for transparent shadow padding area
ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  if (mainWindow) {
    mainWindow.setIgnoreMouseEvents(ignore, options);
  }
});

// Close Application (Hide to tray area)
ipcMain.on('close-app', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

// Trigger Notification and Window Flashing (Rings when in Tray)
ipcMain.on('trigger-alarm-notification', (event, title, body) => {
  // 1. Show OS Native Notification so it displays toast and sounds
  try {
    if (Notification.isSupported()) {
      const customIconPath = path.join(app.getPath('userData'), 'icon.png');
      const packagedIconPath = path.join(__dirname, 'icon.png');
      const iconPath = fs.existsSync(customIconPath) ? customIconPath : (fs.existsSync(packagedIconPath) ? packagedIconPath : undefined);

      const notification = new Notification({
        title: title || 'Economic Event Alarm',
        body: body || 'High volatility economic news upcoming!',
        silent: false, // Ensure system notification sound plays
        icon: iconPath
      });
      notification.show();
    }
  } catch (err) {
    console.error('Error showing native OS notification:', err);
  }

  // 2. Display balloon in system tray if available
  try {
    if (tray) {
      tray.displayBalloon({
        title: title || 'Economic Event Alarm',
        content: body || 'High volatility economic news upcoming!'
      });
    }
  } catch (err) {
    console.error('Error displaying tray balloon:', err);
  }

  // 3. Flash taskbar frame/icon to grab user attention
  try {
    if (mainWindow) {
      mainWindow.flashFrame(true);
      setTimeout(() => {
        if (mainWindow) {
          mainWindow.flashFrame(false);
        }
      }, 6000);
    }
  } catch (err) {
    console.error('Error flashing main window frame:', err);
  }
});

// Set Height dynamically (e.g. on minimizing)
ipcMain.on('set-height', (event, height) => {
  if (mainWindow) {
    const [w] = mainWindow.getSize();
    const config = readConfig();
    const scale = config.scale || 1.0;
    const newHeight = Math.round((height + 200) * scale);
    lastTargetH = newHeight;
    mainWindow.setSize(w, newHeight);
  }
});

// Track exact bounds in scaled layout
ipcMain.on('card-bounds', (event, bounds) => {
  if (mainWindow && bounds) {
    const config = readConfig();
    const activeScale = bounds.scale !== undefined ? bounds.scale : (config.scale || 1.0);
    
    // Resize Electron window to leave ample transparent padding so the card's deep blurred drop shadow doesn't get clipped
    const targetW = Math.max(100, Math.round((bounds.w + 140) * activeScale));
    const targetH = Math.max(50, Math.round((bounds.h + 200) * activeScale));
    
    // Store latest target size programmatically
    lastTargetW = targetW;
    lastTargetH = targetH;
    
    // Fetch current position and size
    const [currentX, currentY] = mainWindow.getPosition();
    const [currentW, currentH] = mainWindow.getSize();
    
    // Initialize or read position from cached values
    if (cachedX === null || cachedY === null) {
      cachedX = currentX;
      cachedY = currentY;
    }
    if (cachedScale === null) {
      cachedScale = activeScale;
    }
    
    let newX = currentX;
    let newY = currentY;
    
    const isScaleChanged = cachedScale !== null && Math.abs(activeScale - cachedScale) > 0.01;
    
    if (isScaling && scaleCenterX !== null && scaleCenterY !== null) {
      // Anchors the absolute center of the window during active drag-and-resize scaling
      newX = Math.round(scaleCenterX - targetW / 2);
      newY = Math.round(scaleCenterY - targetH / 2);
      cachedScale = activeScale;
    } else if (isScaleChanged) {
      // Anchors the visual center of the window if scale changed discretely (e.g. from settings option)
      const centerX = currentX + currentW / 2;
      const centerY = currentY + currentH / 2;
      newX = Math.round(centerX - targetW / 2);
      newY = Math.round(centerY - targetH / 2);
      cachedScale = activeScale;
    } else {
      // Keeps the top-left of the window perfectly constant for normal height updates 
      // (minimizing/expanding, adding/removing checklist items, settings toggles)
      // to guarantee zero visual shift mismatch and zero flickering.
      newX = currentX;
      newY = currentY;
      cachedScale = activeScale;
    }
    
    // Update cache proactively before the asynchronous window shift settles
    cachedX = newX;
    cachedY = newY;
    
    isProgrammaticBoundsUpdate = true;
    if (programmaticTimeout) clearTimeout(programmaticTimeout);
    
    mainWindow.setBounds({
      x: newX,
      y: newY,
      width: targetW,
      height: targetH
    });
    
    programmaticTimeout = setTimeout(() => {
      isProgrammaticBoundsUpdate = false;
    }, 200);
    
    writeConfig({ x: newX, y: newY, scale: activeScale });
  }
});

ipcMain.on('scale-start', () => {
  isScaling = true;
  if (mainWindow) {
    const [x, y] = mainWindow.getPosition();
    const [w, h] = mainWindow.getSize();
    scaleCenterX = x + w / 2;
    scaleCenterY = y + h / 2;
  }
});

ipcMain.on('scale-end', (event, scale) => {
  isScaling = false;
  scaleCenterX = null;
  scaleCenterY = null;
  writeConfig({ scale });
});

ipcMain.on('save-icon', (event, dataUrl) => {
  try {
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
    const customIconPath = path.join(app.getPath('userData'), 'icon.png');
    fs.writeFileSync(customIconPath, base64Data, 'base64');
    
    // Dynamically update main window icon
    if (mainWindow) {
      const nativeImg = nativeImage.createFromPath(customIconPath);
      mainWindow.setIcon(nativeImg);
    }
    
    // Dynamically update tray icon
    if (tray) {
      let trayImg;
      if (process.platform === 'win32') {
        trayImg = nativeImage.createFromPath(customIconPath).resize({ width: 32, height: 32, quality: 'best' });
      } else if (process.platform === 'darwin') {
        trayImg = nativeImage.createFromPath(customIconPath).resize({ width: 16, height: 16, quality: 'best' });
        trayImg.setTemplateImage(true);
      } else {
        trayImg = nativeImage.createFromPath(customIconPath).resize({ width: 24, height: 24, quality: 'best' });
      }
      tray.setImage(trayImg);
    }
  } catch (err) {
    console.error('Error saving dynamic icon:', err);
  }
});

ipcMain.on('install-update', () => {
  userRequestedInstall = true;
  if (isUpdateDownloaded) {
    isQuitting = true;
    autoUpdater.quitAndInstall(false, true);
  }
});
