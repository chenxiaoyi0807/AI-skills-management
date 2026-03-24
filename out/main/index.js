"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const child_process = require("child_process");
const util = require("util");
const is = {
  dev: !electron.app.isPackaged
};
const platform = {
  isWindows: process.platform === "win32",
  isMacOS: process.platform === "darwin",
  isLinux: process.platform === "linux"
};
const electronApp = {
  setAppUserModelId(id) {
    if (platform.isWindows)
      electron.app.setAppUserModelId(is.dev ? process.execPath : id);
  },
  setAutoLaunch(auto) {
    if (platform.isLinux)
      return false;
    const isOpenAtLogin = () => {
      return electron.app.getLoginItemSettings().openAtLogin;
    };
    if (isOpenAtLogin() !== auto) {
      electron.app.setLoginItemSettings({
        openAtLogin: auto,
        path: process.execPath
      });
      return isOpenAtLogin() === auto;
    } else {
      return true;
    }
  },
  skipProxy() {
    return electron.session.defaultSession.setProxy({ mode: "direct" });
  }
};
const optimizer = {
  watchWindowShortcuts(window, shortcutOptions) {
    if (!window)
      return;
    const { webContents } = window;
    const { escToCloseWindow = false, zoom = false } = shortcutOptions || {};
    webContents.on("before-input-event", (event, input) => {
      if (input.type === "keyDown") {
        if (!is.dev) {
          if (input.code === "KeyR" && (input.control || input.meta))
            event.preventDefault();
        } else {
          if (input.code === "F12") {
            if (webContents.isDevToolsOpened()) {
              webContents.closeDevTools();
            } else {
              webContents.openDevTools({ mode: "undocked" });
              console.log("Open dev tool...");
            }
          }
        }
        if (escToCloseWindow) {
          if (input.code === "Escape" && input.key !== "Process") {
            window.close();
            event.preventDefault();
          }
        }
        if (!zoom) {
          if (input.code === "Minus" && (input.control || input.meta))
            event.preventDefault();
          if (input.code === "Equal" && input.shift && (input.control || input.meta))
            event.preventDefault();
        }
      }
    });
  },
  registerFramelessWindowIpc() {
    electron.ipcMain.on("win:invoke", (event, action) => {
      const win = electron.BrowserWindow.fromWebContents(event.sender);
      if (win) {
        if (action === "show") {
          win.show();
        } else if (action === "showInactive") {
          win.showInactive();
        } else if (action === "min") {
          win.minimize();
        } else if (action === "max") {
          const isMaximized = win.isMaximized();
          if (isMaximized) {
            win.unmaximize();
          } else {
            win.maximize();
          }
        } else if (action === "close") {
          win.close();
        }
      }
    });
  }
};
const DEFAULT_CONFIG = {
  rootDir: "",
  tags: {},
  syncUrls: {},
  githubToken: "",
  syncRepoUrl: ""
};
class ConfigManager {
  configPath;
  config = null;
  constructor() {
    const userDataPath = electron.app.getPath("userData");
    this.configPath = path.join(userDataPath, "data.json");
  }
  /** 加载配置（带缓存） */
  async loadConfig() {
    if (this.config) return this.config;
    try {
      const raw = await fs.promises.readFile(this.configPath, "utf-8");
      this.config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch {
      this.config = { ...DEFAULT_CONFIG };
    }
    return this.config;
  }
  /** 保存配置（原子写入） */
  async saveConfig(config) {
    this.config = config;
    const tmpPath = this.configPath + ".tmp";
    await fs.promises.writeFile(tmpPath, JSON.stringify(config, null, 2), "utf-8");
    await fs.promises.rename(tmpPath, this.configPath);
  }
  /** 设置根目录 */
  async setRootDir(dirPath) {
    const config = await this.loadConfig();
    config.rootDir = dirPath;
    await this.saveConfig(config);
  }
  /** 更新云端同步配置 */
  async updateCloudConfig(githubToken, syncRepoUrl) {
    const config = await this.loadConfig();
    config.githubToken = githubToken;
    config.syncRepoUrl = syncRepoUrl;
    await this.saveConfig(config);
  }
  /** 更新指定文件夹的标签 */
  async updateTags(folderName, tags) {
    const config = await this.loadConfig();
    config.tags[folderName] = tags;
    await this.saveConfig(config);
  }
  /** 获取指定文件夹的标签 */
  async getTags(folderName) {
    const config = await this.loadConfig();
    return config.tags[folderName] || [];
  }
}
const configManager = new ConfigManager();
function registerConfigHandlers() {
  electron.ipcMain.handle("config:get", async () => {
    return await configManager.loadConfig();
  });
  electron.ipcMain.handle("config:setRootDir", async (_event, dirPath) => {
    try {
      await configManager.setRootDir(dirPath);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : "设置根目录失败"
      };
    }
  });
  electron.ipcMain.handle("config:updateCloud", async (_event, githubToken, syncRepoUrl) => {
    try {
      await configManager.updateCloudConfig(githubToken, syncRepoUrl);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : "保存云端同步配置失败"
      };
    }
  });
}
class FileScanner {
  /**
   * 扫描根目录下的一级子文件夹
   * 每个子文件夹映射为一个 SkillCard
   */
  async scanRootDir(rootDir) {
    let entries;
    try {
      entries = await fs.promises.readdir(rootDir, { withFileTypes: true });
    } catch {
      return [];
    }
    const config = await configManager.loadConfig();
    const cards = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      const folderPath = path.join(rootDir, entry.name);
      const { count: fileCount, latestDate } = await this.countFilesAndLatestUpdate(folderPath);
      let updatedAt = latestDate;
      if (updatedAt === 0) {
        try {
          const stat = await fs.promises.stat(folderPath);
          updatedAt = Math.max(stat.mtimeMs, stat.birthtimeMs);
        } catch {
          updatedAt = Date.now();
        }
      }
      cards.push({
        name: entry.name,
        fileCount,
        tags: config.tags[entry.name] || [],
        path: folderPath,
        syncUrl: config.syncUrls?.[entry.name],
        updatedAt
      });
    }
    cards.sort((a, b) => a.name.localeCompare(b.name));
    return cards;
  }
  /**
   * 获取指定文件夹的完整文件树
   * 包含所有文件（不限 .md 格式）
   */
  async getFileTree(folderPath) {
    return this.buildTree(folderPath, "");
  }
  /** 递归构建文件树 */
  async buildTree(basePath, relativePath) {
    const currentPath = relativePath ? path.join(basePath, relativePath) : basePath;
    let entries;
    try {
      entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
    } catch {
      return [];
    }
    const nodes = [];
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const entryRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        const children = await this.buildTree(basePath, entryRelativePath);
        if (children.length > 0) {
          nodes.push({
            name: entry.name,
            type: "directory",
            relativePath: entryRelativePath,
            children
          });
        }
      } else if (entry.isFile()) {
        nodes.push({
          name: entry.name,
          type: "file",
          relativePath: entryRelativePath
        });
      }
    }
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return nodes;
  }
  /** 递归统计文件夹内的所有非隐藏文件数量，并返回最新文件的修改时间戳 */
  async countFilesAndLatestUpdate(folderPath) {
    let count = 0;
    let latestDate = 0;
    let entries;
    try {
      entries = await fs.promises.readdir(folderPath, { withFileTypes: true });
    } catch {
      return { count: 0, latestDate: 0 };
    }
    try {
      const stat = await fs.promises.stat(folderPath);
      latestDate = Math.max(latestDate, stat.mtimeMs, stat.birthtimeMs);
    } catch {
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = path.join(folderPath, entry.name);
      if (entry.isDirectory()) {
        const result = await this.countFilesAndLatestUpdate(fullPath);
        count += result.count;
        latestDate = Math.max(latestDate, result.latestDate);
      } else if (entry.isFile()) {
        count++;
        try {
          const stat = await fs.promises.stat(fullPath);
          latestDate = Math.max(latestDate, stat.mtimeMs, stat.birthtimeMs);
        } catch {
        }
      }
    }
    return { count, latestDate };
  }
  /** 判断文件是否为可预览的 Markdown 文件 */
  static isMarkdown(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    return ext === ".md" || ext === ".mdx" || ext === ".markdown";
  }
}
const fileScanner = new FileScanner();
class MarkdownReader {
  /**
   * 读取指定 Skill 下的文件内容
   * @param skillName Skill 文件夹名
   * @param relativePath 文件相对路径
   */
  async readFile(skillName, relativePath) {
    const config = await configManager.loadConfig();
    const filePath = path.join(config.rootDir, skillName, relativePath);
    const normalizedRoot = path.join(config.rootDir, skillName);
    if (!filePath.startsWith(normalizedRoot)) {
      throw new Error("非法路径访问");
    }
    const content = await fs.promises.readFile(filePath, "utf-8");
    return content;
  }
  /**
   * 将内容写入指定 Skill 下的文件
   * @param skillName Skill 文件夹名
   * @param relativePath 文件相对路径
   * @param content 要写入的文件内容
   */
  async writeFile(skillName, relativePath, content) {
    const config = await configManager.loadConfig();
    const filePath = path.join(config.rootDir, skillName, relativePath);
    const normalizedRoot = path.join(config.rootDir, skillName);
    if (!filePath.startsWith(normalizedRoot)) {
      throw new Error("非法路径访问");
    }
    await fs.promises.writeFile(filePath, content, "utf-8");
  }
}
const markdownReader = new MarkdownReader();
function registerSkillsHandlers() {
  electron.ipcMain.handle("skills:list", async () => {
    const config = await configManager.loadConfig();
    if (!config.rootDir) return [];
    return await fileScanner.scanRootDir(config.rootDir);
  });
  electron.ipcMain.handle("skills:fileTree", async (_event, skillName) => {
    const config = await configManager.loadConfig();
    if (!config.rootDir) return [];
    const folderPath = path.join(config.rootDir, skillName);
    return await fileScanner.getFileTree(folderPath);
  });
  electron.ipcMain.handle(
    "skills:fileContent",
    async (_event, skillName, relativePath) => {
      try {
        const content = await markdownReader.readFile(skillName, relativePath);
        return { success: true, content };
      } catch (err) {
        return {
          success: false,
          content: "",
          message: err instanceof Error ? err.message : "读取文件失败"
        };
      }
    }
  );
  electron.ipcMain.handle(
    "skills:updateTags",
    async (_event, skillName, tags) => {
      try {
        await configManager.updateTags(skillName, tags);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          message: err instanceof Error ? err.message : "更新标签失败"
        };
      }
    }
  );
  electron.ipcMain.handle(
    "skills:saveFileContent",
    async (_event, skillName, relativePath, content) => {
      try {
        await markdownReader.writeFile(skillName, relativePath, content);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          message: err instanceof Error ? err.message : "保存文件失败"
        };
      }
    }
  );
}
class DeployEngine {
  /**
   * 冲突预检
   * 检查目标目录中是否存在同名文件
   */
  async checkConflicts(req) {
    const config = await configManager.loadConfig();
    const skillPath = path.join(config.rootDir, req.skillName);
    const deployTargetBase = path.join(req.targetDir, req.skillName);
    const conflicts = [];
    for (const file of req.files) {
      const sourcePath = path.join(skillPath, file);
      const targetPath = path.join(deployTargetBase, file);
      try {
        await fs.promises.access(targetPath);
        conflicts.push({
          fileName: file,
          sourcePath,
          targetPath
        });
      } catch {
      }
    }
    return conflicts;
  }
  /**
   * 执行部署
   * 将文件从源目录复制到目标目录
   * @param req 部署请求
   * @param resolutions 冲突处理策略 { 文件相对路径: 'overwrite' | 'skip' }
   */
  async executeDeploy(req, resolutions = {}) {
    const config = await configManager.loadConfig();
    const skillPath = path.join(config.rootDir, req.skillName);
    const deployTargetBase = path.join(req.targetDir, req.skillName);
    const results = [];
    for (const file of req.files) {
      const sourcePath = path.join(skillPath, file);
      const targetPath = path.join(deployTargetBase, file);
      try {
        let exists = false;
        try {
          await fs.promises.access(targetPath);
          exists = true;
        } catch {
        }
        if (exists) {
          const resolution = resolutions[file];
          if (resolution === "skip") {
            results.push({ fileName: file, status: "skipped", message: "用户选择跳过" });
            continue;
          }
        }
        await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.promises.copyFile(sourcePath, targetPath);
        results.push({
          fileName: file,
          status: exists ? "overwritten" : "copied"
        });
      } catch (err) {
        results.push({
          fileName: file,
          status: "error",
          message: err instanceof Error ? err.message : "未知错误"
        });
      }
    }
    return results;
  }
}
const deployEngine = new DeployEngine();
function registerDeployHandlers() {
  electron.ipcMain.handle("deploy:check", async (_event, req) => {
    try {
      const conflicts = await deployEngine.checkConflicts(req);
      return { success: true, conflicts };
    } catch (err) {
      return {
        success: false,
        conflicts: [],
        message: err instanceof Error ? err.message : "冲突检测失败"
      };
    }
  });
  electron.ipcMain.handle(
    "deploy:execute",
    async (_event, req, resolutions) => {
      try {
        const results = await deployEngine.executeDeploy(req, resolutions);
        return { success: true, results };
      } catch (err) {
        return {
          success: false,
          results: [],
          message: err instanceof Error ? err.message : "部署执行失败"
        };
      }
    }
  );
}
function registerDialogHandlers() {
  electron.ipcMain.handle("dialog:selectFolder", async () => {
    const win = electron.BrowserWindow.getFocusedWindow();
    if (!win) return { canceled: true, path: "" };
    const result = await electron.dialog.showOpenDialog(win, {
      title: "选择部署目标目录",
      properties: ["openDirectory"]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, path: "" };
    }
    return { canceled: false, path: result.filePaths[0] };
  });
  electron.ipcMain.handle("dialog:selectRootDir", async () => {
    const win = electron.BrowserWindow.getFocusedWindow();
    if (!win) return { canceled: true, path: "" };
    const result = await electron.dialog.showOpenDialog(win, {
      title: "选择 Skills 根目录",
      properties: ["openDirectory"],
      message: "请选择包含所有 Skill 文件夹的根目录"
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, path: "" };
    }
    return { canceled: false, path: result.filePaths[0] };
  });
}
const execAsync$1 = util.promisify(child_process.exec);
class GitSyncService {
  /**
   * 执行 Git Clone（或对已存在的本地文件夹进行绑定）
   * @param repoUrl GitHub 仓库地址
   * @param folderName 目标文件夹名
   */
  async cloneSkill(repoUrl, folderName) {
    const config = await configManager.loadConfig();
    if (!config.rootDir) throw new Error("未设置 Skill 根目录");
    const targetDir = path.join(config.rootDir, folderName);
    let isExist = false;
    try {
      await fs.promises.access(targetDir);
      isExist = true;
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    let cleanRepoUrl = repoUrl;
    let subPath = "";
    try {
      const parsedUrl = new URL(repoUrl);
      if (parsedUrl.hostname === "github.com") {
        const parts = parsedUrl.pathname.split("/").filter(Boolean);
        if (parts.length >= 2) {
          let repoName = parts[1];
          if (repoName.endsWith(".git")) {
            repoName = repoName.slice(0, -4);
          }
          cleanRepoUrl = `https://github.com/${parts[0]}/${repoName}`;
          if (parts.length >= 4 && (parts[2] === "tree" || parts[2] === "blob")) {
            if (parts.length > 4) {
              let pathParts = parts.slice(4);
              if (parts[2] === "blob" && pathParts.length > 0) {
                pathParts.pop();
              }
              if (pathParts.length > 0) {
                subPath = pathParts.join("/");
              }
            }
          }
        }
      }
    } catch (e) {
    }
    if (!isExist) {
      await fs.promises.mkdir(targetDir, { recursive: true });
      await execAsync$1(`git init`, { cwd: targetDir });
      await execAsync$1(`git remote add origin "${cleanRepoUrl}"`, { cwd: targetDir });
      try {
        await execAsync$1(`git fetch --depth 1 origin`, { cwd: targetDir });
        if (subPath) {
          await execAsync$1(`git config core.sparseCheckout false`, { cwd: targetDir }).catch(() => {
          });
          try {
            await execAsync$1(`git read-tree -u --reset origin/main:${subPath}`, { cwd: targetDir });
          } catch {
            try {
              await execAsync$1(`git read-tree -u --reset origin/master:${subPath}`, { cwd: targetDir });
            } catch {
              await execAsync$1(`git pull`, { cwd: targetDir });
            }
          }
        } else {
          await execAsync$1(`git config core.sparseCheckout true`, { cwd: targetDir });
          const infoDir = path.join(targetDir, ".git", "info");
          await fs.promises.mkdir(infoDir, { recursive: true });
          await fs.promises.writeFile(path.join(infoDir, "sparse-checkout"), "/*\n", "utf-8");
          try {
            await execAsync$1(`git reset --hard origin/main`, { cwd: targetDir });
          } catch {
            try {
              await execAsync$1(`git reset --hard origin/master`, { cwd: targetDir });
            } catch {
              await execAsync$1(`git pull`, { cwd: targetDir });
            }
          }
        }
      } catch (err) {
        throw new Error("未拉取到远端内容: " + err.message);
      }
    }
    config.syncUrls = config.syncUrls || {};
    config.syncUrls[folderName] = repoUrl;
    await configManager.saveConfig(config);
    if (isExist) {
      await this.updateSkill(folderName);
    }
  }
  /**
   * 执行 Git Pull 更新指定 Skill（带强制初始化与覆盖机制，确保总能同步最新仓库内容）
   * @param folderName 指定文件夹名
   */
  async updateSkill(folderName) {
    const config = await configManager.loadConfig();
    if (!config.rootDir) throw new Error("未设置 Skill 根目录");
    const targetDir = path.join(config.rootDir, folderName);
    let repoUrl = config.syncUrls?.[folderName];
    if (!repoUrl) {
      throw new Error(`未找到 ${folderName} 的绑定的 GitHub 地址，无法更新`);
    }
    let subPath = "";
    try {
      const parsedUrl = new URL(repoUrl);
      if (parsedUrl.hostname === "github.com") {
        const parts = parsedUrl.pathname.split("/").filter(Boolean);
        if (parts.length >= 2) {
          let repoName = parts[1];
          if (repoName.endsWith(".git")) {
            repoName = repoName.slice(0, -4);
          }
          repoUrl = `https://github.com/${parts[0]}/${repoName}`;
          if (parts.length >= 4 && (parts[2] === "tree" || parts[2] === "blob")) {
            if (parts.length > 4) {
              let pathParts = parts.slice(4);
              if (parts[2] === "blob" && pathParts.length > 0) {
                pathParts.pop();
              }
              if (pathParts.length > 0) {
                subPath = pathParts.join("/");
              }
            }
          }
        }
      }
    } catch (e) {
    }
    try {
      await fs.promises.access(path.join(targetDir, ".git"));
      try {
        await execAsync$1(`git remote set-url origin "${repoUrl}"`, { cwd: targetDir });
      } catch {
        await execAsync$1(`git remote add origin "${repoUrl}"`, { cwd: targetDir });
      }
    } catch {
      await execAsync$1(`git init`, { cwd: targetDir });
      await execAsync$1(`git remote add origin "${repoUrl}"`, { cwd: targetDir });
    }
    await execAsync$1(`git fetch --all`, { cwd: targetDir });
    if (subPath) {
      await execAsync$1(`git config core.sparseCheckout false`, { cwd: targetDir }).catch(() => {
      });
      const infoDir = path.join(targetDir, ".git", "info");
      await fs.promises.mkdir(infoDir, { recursive: true });
      await fs.promises.writeFile(path.join(infoDir, "sparse-checkout"), "/*\n", "utf-8");
      try {
        await execAsync$1(`git read-tree -u --reset origin/main:${subPath}`, { cwd: targetDir });
      } catch {
        try {
          await execAsync$1(`git read-tree -u --reset origin/master:${subPath}`, { cwd: targetDir });
        } catch {
          await execAsync$1(`git pull`, { cwd: targetDir });
        }
      }
    } else {
      await execAsync$1(`git config core.sparseCheckout true`, { cwd: targetDir });
      const infoDir = path.join(targetDir, ".git", "info");
      await fs.promises.mkdir(infoDir, { recursive: true });
      let sparseContent = "";
      const items = await fs.promises.readdir(targetDir);
      const validItems = items.filter((item) => item !== ".git");
      if (validItems.length > 0) {
        for (const item of validItems) {
          const stat = await fs.promises.stat(path.join(targetDir, item));
          if (stat.isDirectory()) {
            sparseContent += `/${item}/
`;
          } else {
            sparseContent += `/${item}
`;
          }
        }
      } else {
        sparseContent = "/*\n";
      }
      await fs.promises.writeFile(path.join(infoDir, "sparse-checkout"), sparseContent, "utf-8");
      try {
        await execAsync$1(`git reset --hard origin/main`, { cwd: targetDir });
      } catch {
        try {
          await execAsync$1(`git reset --hard origin/master`, { cwd: targetDir });
        } catch {
          await execAsync$1(`git pull`, { cwd: targetDir });
        }
      }
    }
  }
  /**
   * 一键全局更新：遍历 syncUrls 中所有绑定的项目
   */
  async updateAllSkills() {
    const config = await configManager.loadConfig();
    if (!config.rootDir || !config.syncUrls) return { success: [], failed: [] };
    const success = [];
    const failed = [];
    const folders = Object.keys(config.syncUrls);
    for (const folder of folders) {
      try {
        await this.updateSkill(folder);
        success.push(folder);
      } catch (error) {
        failed.push({ name: folder, error: error.message || String(error) });
      }
    }
    return { success, failed };
  }
  /**
   * 定时自动检测：如果超过 7 天未更新，则触发后台自动更新
   * 返回 true 代表触发了更新且成功，false 没触发，或抛出错误
   */
  async checkAndAutoSync() {
    const config = await configManager.loadConfig();
    const now = Date.now();
    const lastSync = config.lastAutoSyncTime || 0;
    if (now - lastSync >= 6048e5) {
      console.log("触发后台自动更新所有 Git Skills...");
      await this.updateAllSkills();
      config.lastAutoSyncTime = now;
      await configManager.saveConfig(config);
      return true;
    }
    return false;
  }
}
const gitSyncService = new GitSyncService();
const execAsync = util.promisify(child_process.exec);
class CloudSyncService {
  /**
   * 将整个 rootDir 中的所有的子层级 `.git` 改名为 `._git` (如果 targetName='._git')
   * 或者将所有的 `._git` 恢复为 `.git` (如果 targetName='.git')
   * 只有这样才能骗过外部根目录的 git 使得它将这些子系统仅仅当成受控的文件库推送。
   */
  async renameGitFolders(targetName) {
    const config = await configManager.loadConfig();
    if (!config.rootDir) return;
    const sourceName = targetName === ".git" ? "._git" : ".git";
    try {
      const items = await fs.promises.readdir(config.rootDir, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory() && !item.name.startsWith(".")) {
          const skillPath = path.join(config.rootDir, item.name);
          const sourceGitPath = path.join(skillPath, sourceName);
          try {
            const stat = await fs.promises.stat(sourceGitPath);
            if (stat.isDirectory()) {
              await fs.promises.rename(sourceGitPath, path.join(skillPath, targetName));
            }
          } catch (e) {
            if (e.code !== "ENOENT") {
              console.error(`重命名失败 ${sourceGitPath}:`, e);
            }
          }
        }
      }
    } catch (error) {
      console.error("遍历根目录失败:", error);
    }
  }
  /**
   * 一键将所有的技能库打包推送到您的私有 Github 云端仓库
   */
  async syncToCloud() {
    const config = await configManager.loadConfig();
    if (!config.rootDir) throw new Error("未设置技能根目录。");
    if (!config.syncRepoUrl || !config.githubToken) throw new Error("未配置私有云端仓库地址或 Github Token。请在设置中配置。");
    const token = config.githubToken.trim();
    const repoUrl = config.syncRepoUrl.trim();
    const authUrl = repoUrl.replace("https://", `https://${token}@`);
    try {
      await this.renameGitFolders("._git");
      const targetDir = config.rootDir;
      try {
        await fs.promises.access(path.join(targetDir, ".git"));
        try {
          await execAsync(`git remote set-url origin "${authUrl}"`, { cwd: targetDir });
        } catch {
          await execAsync(`git remote add origin "${authUrl}"`, { cwd: targetDir });
        }
      } catch {
        await execAsync(`git init`, { cwd: targetDir });
        await execAsync(`git remote add origin "${authUrl}"`, { cwd: targetDir });
      }
      await execAsync(`git add .`, { cwd: targetDir });
      try {
        await execAsync(`git commit -m "Auto sync from Skill Manager - ${(/* @__PURE__ */ new Date()).toISOString()}"`, { cwd: targetDir });
      } catch (e) {
        if (!e.stdout?.includes("nothing to commit")) {
          throw e;
        }
      }
      await execAsync(`git push -f -u origin HEAD:main`, { cwd: targetDir });
      config.lastCloudSyncTime = Date.now();
      await configManager.saveConfig(config);
    } finally {
      await this.renameGitFolders(".git");
    }
  }
  /**
   * 从您的私有 Github 云端仓库一次性全量拉取，直接冲刷并覆盖本设备上的技能库
   */
  async pullFromCloud() {
    const config = await configManager.loadConfig();
    if (!config.rootDir) throw new Error("未设置技能根目录。");
    if (!config.syncRepoUrl || !config.githubToken) throw new Error("未配置私有云端仓库地址或 Github Token。请在设置中配置。");
    const token = config.githubToken.trim();
    const repoUrl = config.syncRepoUrl.trim();
    const authUrl = repoUrl.replace("https://", `https://${token}@`);
    try {
      await this.renameGitFolders("._git");
      const targetDir = config.rootDir;
      try {
        await fs.promises.access(path.join(targetDir, ".git"));
        try {
          await execAsync(`git remote set-url origin "${authUrl}"`, { cwd: targetDir });
        } catch {
          await execAsync(`git remote add origin "${authUrl}"`, { cwd: targetDir });
        }
      } catch {
        await execAsync(`git init`, { cwd: targetDir });
        await execAsync(`git remote add origin "${authUrl}"`, { cwd: targetDir });
      }
      await execAsync(`git fetch --all`, { cwd: targetDir });
      await execAsync(`git reset --hard origin/main`, { cwd: targetDir });
      await execAsync(`git clean -fd`, { cwd: targetDir });
      config.lastCloudSyncTime = Date.now();
      await configManager.saveConfig(config);
    } finally {
      await this.renameGitFolders(".git");
    }
  }
}
const cloudSyncService = new CloudSyncService();
function registerSyncHandlers() {
  electron.ipcMain.handle("sync:clone-skill", async (_, repoUrl, folderName) => {
    try {
      await gitSyncService.cloneSkill(repoUrl, folderName);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message || String(error) };
    }
  });
  electron.ipcMain.handle("sync:update-skill", async (_, folderName) => {
    try {
      await gitSyncService.updateSkill(folderName);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message || String(error) };
    }
  });
  electron.ipcMain.handle("sync:update-all-skills", async () => {
    try {
      const result = await gitSyncService.updateAllSkills();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, message: error.message || String(error) };
    }
  });
  electron.ipcMain.handle("sync:check-auto", async () => {
    try {
      const triggered = await gitSyncService.checkAndAutoSync();
      return { success: true, data: triggered };
    } catch (error) {
      return { success: false, message: error.message || String(error) };
    }
  });
  electron.ipcMain.handle("cloudSync:push", async () => {
    try {
      await cloudSyncService.syncToCloud();
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message || String(error) };
    }
  });
  electron.ipcMain.handle("cloudSync:pull", async () => {
    try {
      await cloudSyncService.pullFromCloud();
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message || String(error) };
    }
  });
}
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: "AI skills 管理",
    icon: path.resolve(__dirname, "../../resources/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.name = "Skill 管理工具";
const gotTheLock = electron.app.requestSingleInstanceLock();
if (!gotTheLock) {
  electron.app.quit();
} else {
  electron.app.on("second-instance", () => {
    const windows = electron.BrowserWindow.getAllWindows();
    if (windows.length) {
      const mainWindow = windows[0];
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  electron.app.whenReady().then(() => {
    electronApp.setAppUserModelId("com.ai-skills-manager");
    registerConfigHandlers();
    registerSkillsHandlers();
    registerDeployHandlers();
    registerDialogHandlers();
    registerSyncHandlers();
    electron.app.on("browser-window-created", (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });
    createWindow();
    electron.app.on("activate", () => {
      if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
  electron.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      electron.app.quit();
    }
  });
}
