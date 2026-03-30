import { app, BrowserWindow } from "electron";
import path from "path";
import startServe, { closeServe } from "src/app";

// 默认端口配置
const defaultPort = 60000;

function createMainWindow(port: number): void {
  console.log(`[创建窗口] 端口: ${port}`);
  
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,  // 先不显示，等待 ready-to-show
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 窗口准备好后再显示
  win.once("ready-to-show", () => {
    console.log("[窗口准备完成，显示窗口]");
    win.show();
  });

  // 监听加载错误
  win.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[页面加载失败] 错误码: ${errorCode}, 描述: ${errorDescription}, URL: ${validatedURL}`);
  });

  // 监听控制台消息
  win.webContents.on("console-message", (event, level, message, line, sourceId) => {
    console.log(`[渲染进程控制台] ${message}`);
  });

  // 开发环境和生产环境使用不同的路径
  const isDev = process.env.NODE_ENV === "dev" || !app.isPackaged;
  const htmlPath = isDev
    ? path.join(process.cwd(), "scripts", "web", "index.html")
    : path.join(app.getAppPath(), "scripts", "web", "index.html");

  console.log(`[HTML路径] ${htmlPath}`);
  console.log(`[isDev] ${isDev}, [isPackaged] ${app.isPackaged}`);

  // 使用实际端口构建地址
  const baseUrl = `http://localhost:${port}`;
  const wsBaseUrl = `ws://localhost:${port}`;

  // Windows 上 file:// 路径需要特殊处理
  const fileUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;
  const url = new URL(fileUrl);
  url.searchParams.set("baseUrl", baseUrl);
  url.searchParams.set("wsBaseUrl", wsBaseUrl);

  console.log(`[加载URL] ${url.toString()}`);
  console.log(`[API地址] ${baseUrl}`);

  win.loadURL(url.toString()).catch((err) => {
    console.error("[加载页面失败]:", err);
  });
}
app.whenReady().then(async () => {
  try {
    const port = await startServe(false);
    createMainWindow(port);
  } catch (err) {
    console.error("[服务启动失败]:", err);
    // 如果服务启动失败，使用默认端口创建窗口
    createMainWindow(defaultPort);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    // 重新激活时使用默认端口
    createMainWindow(defaultPort);
  }
});

app.on("before-quit", async (event) => {
  await closeServe();
});
