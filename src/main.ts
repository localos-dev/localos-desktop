import { app, BrowserWindow, shell } from "electron";
import {
  createServer,
  IncomingMessage,
  ServerResponse,
  request as httpRequest,
  ClientRequest,
} from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { pathToFileURL } from "node:url";
import net from "node:net";

const isDev = process.env["NODE_ENV"] === "development";

function getResourcesPath(): string {
  if (isDev) {
    return join(app.getAppPath(), "..", "resources");
  }
  return process.resourcesPath;
}

function findFreePort(start: number): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(start, "127.0.0.1", () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
    server.on("error", () =>
      findFreePort(start + 1).then(resolve)
    );
  });
}

function waitForPort(port: number, timeout = 20000): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout;
    function attempt() {
      const sock = new net.Socket();
      sock.setTimeout(600);
      sock.connect(port, "127.0.0.1", () => {
        sock.destroy();
        resolve();
      });
      sock.on("error", () => {
        sock.destroy();
        if (Date.now() < deadline) {
          setTimeout(attempt, 400);
        } else {
          reject(new Error(`Port ${port} not ready after ${timeout}ms`));
        }
      });
      sock.on("timeout", () => {
        sock.destroy();
        if (Date.now() < deadline) {
          setTimeout(attempt, 400);
        } else {
          reject(new Error(`Port ${port} timed out after ${timeout}ms`));
        }
      });
    }
    attempt();
  });
}

const MIME: Record<string, string> = {
  ".html":  "text/html; charset=utf-8",
  ".js":    "application/javascript",
  ".mjs":   "application/javascript",
  ".css":   "text/css",
  ".png":   "image/png",
  ".jpg":   "image/jpeg",
  ".jpeg":  "image/jpeg",
  ".gif":   "image/gif",
  ".svg":   "image/svg+xml",
  ".ico":   "image/x-icon",
  ".json":  "application/json",
  ".woff":  "font/woff",
  ".woff2": "font/woff2",
  ".ttf":   "font/ttf",
  ".mp4":   "video/mp4",
  ".webp":  "image/webp",
  ".txt":   "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

let resolvedApiPort = 0;
let resolvedAppPort = 0;
let frontendServer: ReturnType<typeof createServer> | null = null;

async function startApiServer(resourcesPath: string): Promise<number> {
  const port = await findFreePort(3001);
  resolvedApiPort = port;

  const userData = app.getPath("userData");
  await mkdir(userData, { recursive: true });

  process.env["PORT"] = String(port);
  process.env["NODE_ENV"] = "production";
  process.env["LOCALOS_DB_PATH"] = join(userData, "localos.db");

  const apiPath = join(resourcesPath, "api", "index.mjs");

  // Dynamic import starts the Express server as a side-effect.
  // pathToFileURL handles Windows drive letters (C:\...) correctly.
  await import(pathToFileURL(apiPath).href);

  await waitForPort(port);
  return port;
}

function startFrontendServer(
  resourcesPath: string,
  apiPortNum: number
): Promise<number> {
  return new Promise((resolve, reject) => {
    const frontendDir = join(resourcesPath, "frontend");

    frontendServer = createServer(
      (req: IncomingMessage, res: ServerResponse) => {
        const rawUrl = req.url ?? "/";
        const urlPath = rawUrl.split("?")[0];

        // Proxy /api/* to the Express API server (preserves query string and body)
        if (urlPath.startsWith("/api")) {
          const proxyReq: ClientRequest = httpRequest(
            {
              hostname: "127.0.0.1",
              port: apiPortNum,
              path: rawUrl,
              method: req.method,
              headers: { ...req.headers, host: `127.0.0.1:${apiPortNum}` },
            },
            (proxyRes) => {
              res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
              proxyRes.pipe(res, { end: true });
            }
          );
          proxyReq.on("error", () => {
            if (!res.headersSent) res.writeHead(502);
            res.end("API server unavailable");
          });
          req.pipe(proxyReq, { end: true });
          return;
        }

        // Resolve static file path, fall back to index.html for SPA routes
        let filePath = join(
          frontendDir,
          urlPath === "/" ? "index.html" : urlPath
        );

        if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
          filePath = join(frontendDir, "index.html");
        }

        if (!existsSync(filePath)) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }

        const mime =
          MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream";
        res.writeHead(200, { "Content-Type": mime });
        createReadStream(filePath).pipe(res, { end: true });
      }
    );

    findFreePort(3000).then((port) => {
      resolvedAppPort = port;
      frontendServer!.listen(port, "127.0.0.1", () => resolve(port));
      frontendServer!.on("error", reject);
    });
  });
}

let mainWindow: BrowserWindow | null = null;

function createWindow(port: number): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    backgroundColor: "#0A0A0F",
    show: false,
  });

  // Load the OS workspace directly, not the marketing landing page
  mainWindow.loadURL(`http://127.0.0.1:${port}/app`);

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    if (isDev) mainWindow?.webContents.openDevTools();
  });

  // Open all external http/https links in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    // Allow navigation within the local app server
    if (url.startsWith(`http://127.0.0.1:${port}`)) return;
    event.preventDefault();
    shell.openExternal(url);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    const resourcesPath = getResourcesPath();
    const apiPort = await startApiServer(resourcesPath);
    const appPort = await startFrontendServer(resourcesPath, apiPort);
    createWindow(appPort);
  } catch (err) {
    console.error("LocalOS startup error:", err);
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(resolvedAppPort);
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  frontendServer?.close();
});
