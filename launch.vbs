Dim fso, shell, projectDir, mainFile, electronExe
Set fso   = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

projectDir  = fso.GetParentFolderName(WScript.ScriptFullName)
mainFile    = projectDir & "\out\main\index.js"
electronExe = projectDir & "\node_modules\electron\dist\electron.exe"

If Not fso.FolderExists(projectDir & "\node_modules") Then
    shell.Run "cmd /c cd /d """ & projectDir & """ && npm install", 1, True
End If

If Not fso.FileExists(mainFile) Then
    shell.Run "cmd /c cd /d """ & projectDir & """ && npx electron-vite build", 1, True
End If

shell.Run """" & electronExe & """ """ & projectDir & """", 1, False
