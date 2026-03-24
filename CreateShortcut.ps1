$CurrentDir = $PSScriptRoot
if ([string]::IsNullOrEmpty($CurrentDir)) {
    $CurrentDir = Get-Location
}

$BatFile = Get-ChildItem -Path $CurrentDir -Filter "*.bat" | Where-Object { $_.Name -notmatch "make" -and $_.Name -notmatch "重新" } | Select-Object -First 1

if (-not $BatFile) {
    Write-Error "No target .bat found in $CurrentDir"
    exit 1
}

$CurrentPath = if ($CurrentDir.Path) { $CurrentDir.Path } else { $CurrentDir }

$IconFile = Get-ChildItem -Path "$CurrentPath\resources\icon.ico" | Select-Object -First 1

$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath("Desktop")
# We use the literal name of the shortcut in English
$Shortcut = $WshShell.CreateShortcut("$DesktopPath\AI Skills Manager.lnk")

$Shortcut.TargetPath = "$($BatFile.FullName)"
$Shortcut.WorkingDirectory = "$CurrentPath"
$Shortcut.Description = "AI Skills Manager (Dev Mode)"
if ($IconFile) {
    $Shortcut.IconLocation = "$($IconFile.FullName)"
}
$Shortcut.Save()

Write-Host "Updated Shortcut! Target: $($BatFile.FullName)"
