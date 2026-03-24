$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath("Desktop")
$Shortcut = $WshShell.CreateShortcut("$DesktopPath\AI Skills Manager.lnk")
Write-Host "Target: $($Shortcut.TargetPath)"
Write-Host "Args: $($Shortcut.Arguments)"
Write-Host "Dir: $($Shortcut.WorkingDirectory)"
Write-Host "Icon: $($Shortcut.IconLocation)"
