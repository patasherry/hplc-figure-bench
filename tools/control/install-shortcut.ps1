# Puts an "HFB Control" shortcut on the desktop that opens hfb-control.ps1 without a console window.
$target = Join-Path $PSScriptRoot 'hfb-control.ps1'
$desktop = [Environment]::GetFolderPath('Desktop')
$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut((Join-Path $desktop 'HFB Control.lnk'))
$lnk.TargetPath = (Get-Command powershell.exe).Source
$lnk.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$target`""
$lnk.WorkingDirectory = $PSScriptRoot
$lnk.IconLocation = "$env:SystemRoot\System32\shell32.dll,21"
$lnk.Description = 'Start, stop and check the Figure Bench manager'
$lnk.Save()
Write-Host "Made 'HFB Control' on your desktop. Double-click it to open."
