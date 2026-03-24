$CurrentDir = Get-Location
$VbsFile = Get-ChildItem -Path $CurrentDir -Filter "launch.vbs" | Select-Object -First 1

$IconFile = Get-ChildItem -Path "$($CurrentDir.Path)\resources\icon.png" | Select-Object -First 1

$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath("Desktop")
$Shortcut = $WshShell.CreateShortcut("$DesktopPath\AI Skills Manager.lnk")

$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = """$($VbsFile.FullName)"""
$Shortcut.WorkingDirectory = $CurrentDir.Path
$Shortcut.Description = "AI Skills Manager"
$Shortcut.IconLocation = "$($IconFile.FullName)"
$Shortcut.Save()
Write-Host "Done"
