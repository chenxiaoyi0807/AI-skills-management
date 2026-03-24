' AI Skills Manager - 快速静默启动脚本（生产模式）
' 直接加载已构建产物，跳过 Vite 编译，秒级启动

Dim fso, shell, projectDir, mainFile, electronExe
Set fso   = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

' 自动获取脚本所在目录作为项目根目录
projectDir = fso.GetParentFolderName(WScript.ScriptFullName)
mainFile   = projectDir & "\out\main\index.js"
' 直接使用内部 electron.exe，无需依赖 node.js 环境
electronExe = projectDir & "\node_modules\electron\dist\electron.exe"

' ── 首次使用：确保依赖已安装 ─────────────────
If Not fso.FolderExists(projectDir & "\node_modules") Then
    shell.Run "cmd /c cd /d """ & projectDir & """ && npm install", 1, True
End If

' ── 检查构建产物，不存在则自动构建 ──────────
If Not fso.FileExists(mainFile) Then
    shell.Run "cmd /c cd /d """ & projectDir & """ && npx electron-vite build", 1, True
End If

' ── 直接启动 Electron，无命令窗口，速度极快 ──
' 参数: 窗口模式 0 = 隐藏, False = 不等待
shell.Run """" & electronExe & """ """ & projectDir & """", 1, False
