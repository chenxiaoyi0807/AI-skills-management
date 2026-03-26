"use strict";
const electron = require("electron");
const api = {
  // ---- 配置管理 ----
  /** 获取当前配置 */
  getConfig: () => electron.ipcRenderer.invoke("config:get"),
  /** 设置根目录 */
  setRootDir: (dirPath) => electron.ipcRenderer.invoke("config:setRootDir", dirPath),
  /** 更新云端同步配置 */
  updateCloudConfig: (githubToken, syncRepoUrl) => electron.ipcRenderer.invoke("config:updateCloud", githubToken, syncRepoUrl),
  // ---- Skills 管理 ----
  /** 获取所有 Skill 分类列表 */
  getSkills: () => electron.ipcRenderer.invoke("skills:list"),
  /** 获取指定分类的文件树 */
  getFileTree: (skillName) => electron.ipcRenderer.invoke("skills:fileTree", skillName),
  /** 获取指定文件内容 */
  getFileContent: (skillName, relativePath) => electron.ipcRenderer.invoke("skills:fileContent", skillName, relativePath),
  /** 更新标签 */
  updateTags: (skillName, tags) => electron.ipcRenderer.invoke("skills:updateTags", skillName, tags),
  /** 保存文件内容 */
  saveFileContent: (skillName, relativePath, content) => electron.ipcRenderer.invoke("skills:saveFileContent", skillName, relativePath, content),
  // ---- 部署 ----
  /** 选择目标文件夹 */
  selectFolder: () => electron.ipcRenderer.invoke("dialog:selectFolder"),
  /** 选择根目录文件夹 */
  selectRootDir: () => electron.ipcRenderer.invoke("dialog:selectRootDir"),
  /** 冲突预检 */
  checkConflicts: (req) => electron.ipcRenderer.invoke("deploy:check", req),
  /** 执行部署 */
  executeDeploy: (req, resolutions) => electron.ipcRenderer.invoke("deploy:execute", req, resolutions),
  // ---- Git 同步管理 ----
  /** 导入新 Skill */
  importSkill: (repoUrl, folderName) => electron.ipcRenderer.invoke("sync:clone-skill", repoUrl, folderName),
  /** 解除绑定 */
  unbindSkill: (folderName) => electron.ipcRenderer.invoke("sync:unbind-skill", folderName),
  /** 更新特定 Skill */
  updateSkill: (folderName) => electron.ipcRenderer.invoke("sync:update-skill", folderName),
  /** 更新所有绑定的 Skills */
  updateAllSkills: () => electron.ipcRenderer.invoke("sync:update-all-skills"),
  /** 检查自动更新并执行 */
  checkAutoSync: () => electron.ipcRenderer.invoke("sync:check-auto"),
  // ---- 云端同步 ----
  /** 推送到云端 */
  cloudSyncPush: () => electron.ipcRenderer.invoke("cloudSync:push"),
  /** 从云端拉取 */
  cloudSyncPull: () => electron.ipcRenderer.invoke("cloudSync:pull")
};
electron.contextBridge.exposeInMainWorld("api", api);
