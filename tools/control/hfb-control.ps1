# HFB Control: a small window to start, stop and check the local manager on this PC.
# Open it from the desktop shortcut that install-shortcut.ps1 makes. Nothing here changes GitHub.
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$Repo    = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Startup = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup\hfb-manager.cmd'
$Log     = Join-Path $HOME 'hfb-manager.log'
$Console = 'http://localhost:8765'
$OllamaApp = Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama app.exe'

function Get-Loops   { @(Get-CimInstance Win32_Process -Filter "Name='cmd.exe'" | Where-Object { $_.CommandLine -like '*hfb-manager*' }) }
function Get-Manager { @(Get-CimInstance Win32_Process | Where-Object { $_.Name -like 'python*' -and $_.CommandLine -like '*local-manager*manager.py*' }) }
function Test-Url($url) { try { $null = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2; $true } catch { $false } }

function Stop-Manager {
  Get-Loops   | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Get-Manager | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}
function Start-Ollama {
  if (-not (Test-Url 'http://localhost:11434/api/tags')) {
    if (Test-Path $OllamaApp) { Start-Process $OllamaApp } else { Start-Process 'ollama' -ArgumentList 'serve' -WindowStyle Hidden }
  }
}
function Start-Manager {
  if (-not (Test-Path $Startup)) { [System.Windows.Forms.MessageBox]::Show("Can't find $Startup", 'HFB Control') | Out-Null; return }
  if ((Get-Loops).Count -eq 0) { Start-Process $Startup -WindowStyle Minimized }
}

# ---------- window ----------
$form = New-Object System.Windows.Forms.Form
$form.Text = 'HFB Control'
$form.Size = New-Object System.Drawing.Size(460, 470)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false
$form.Font = New-Object System.Drawing.Font('Segoe UI', 10)

$title = New-Object System.Windows.Forms.Label
$title.Text = 'Figure Bench automation on this PC'
$title.Font = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Bold)
$title.Location = New-Object System.Drawing.Point(16, 12); $title.AutoSize = $true
$form.Controls.Add($title)

$rows = @{}
$y = 48
foreach ($name in 'Manager', 'Local AI (Ollama)', 'Console page', 'Last log line') {
  $dot = New-Object System.Windows.Forms.Label
  $dot.Text = [char]0x25CF; $dot.Location = New-Object System.Drawing.Point(16, $y); $dot.AutoSize = $true; $dot.ForeColor = 'Gray'
  $lbl = New-Object System.Windows.Forms.Label
  $lbl.Text = $name; $lbl.Location = New-Object System.Drawing.Point(36, $y); $lbl.Size = New-Object System.Drawing.Size(130, 22)
  $val = New-Object System.Windows.Forms.Label
  $val.Location = New-Object System.Drawing.Point(170, $y); $val.Size = New-Object System.Drawing.Size(270, 40); $val.ForeColor = 'DimGray'
  $form.Controls.AddRange(@($dot, $lbl, $val)); $rows[$name] = @($dot, $val); $y += 36
}

function Set-Row($name, $ok, $text) {
  $rows[$name][0].ForeColor = $(if ($null -eq $ok) { 'Gray' } elseif ($ok) { 'SeaGreen' } else { 'Firebrick' })
  $rows[$name][1].Text = $text
}

function Update-Status {
  $m = Get-Manager; $l = Get-Loops
  if ($m.Count -eq 1 -and $l.Count -eq 1) { Set-Row 'Manager' $true 'running' }
  elseif ($m.Count -eq 0 -and $l.Count -eq 0) { Set-Row 'Manager' $false 'stopped' }
  elseif ($m.Count -gt 1 -or $l.Count -gt 1) { Set-Row 'Manager' $false "$($m.Count) copies running: press Restart" }
  else { Set-Row 'Manager' $null 'starting' }
  if (Test-Url 'http://localhost:11434/api/tags') { Set-Row 'Local AI (Ollama)' $true 'running' } else { Set-Row 'Local AI (Ollama)' $false 'not running' }
  if (Test-Url "$Console/api/status") { Set-Row 'Console page' $true $Console } else { Set-Row 'Console page' $false 'not answering yet' }
  if (Test-Path $Log) { Set-Row 'Last log line' $null ((Get-Content $Log -Tail 1) -replace '\s+', ' ') } else { Set-Row 'Last log line' $null 'no log yet' }
}

$status = New-Object System.Windows.Forms.Label
$status.Location = New-Object System.Drawing.Point(16, 390); $status.Size = New-Object System.Drawing.Size(420, 22); $status.ForeColor = 'DimGray'
$form.Controls.Add($status)

function Add-Button($text, $x, $yy, $w, $action) {
  $b = New-Object System.Windows.Forms.Button
  $b.Text = $text; $b.Location = New-Object System.Drawing.Point($x, $yy); $b.Size = New-Object System.Drawing.Size($w, 36)
  $b.Tag = $action  # the click handler runs in this script's scope and finds its own action on the button
  $b.Add_Click({ param($sender) $form.Cursor = 'WaitCursor'; try { & $sender.Tag } finally { $form.Cursor = 'Default'; Update-Status } })
  $form.Controls.Add($b); $b
}

$null = Add-Button 'Start everything' 16 200 205 { Start-Ollama; Start-Manager; $status.Text = 'Started. The console answers in about 20 seconds.' }
$null = Add-Button 'Stop for the night' 231 200 205 {
  Stop-Manager
  $status.Text = 'Manager stopped. Jules keeps working in the cloud. It starts again when you log in.'
  if ($stopOllama.Checked) { Get-Process | Where-Object { $_.ProcessName -like 'ollama*' } | Stop-Process -Force -ErrorAction SilentlyContinue; $status.Text += ' Ollama stopped.' }
}
$null = Add-Button 'Update and restart' 16 244 205 {
  $out = & git -C $Repo pull --ff-only 2>&1 | Out-String
  Stop-Manager; Start-Sleep 1; Start-Ollama; Start-Manager
  $status.Text = 'Restarted. ' + $(if ($out -match 'Already up to date') { 'Code was already up to date.' } else { 'New code downloaded.' })
}
$null = Add-Button 'Open Mission Control' 231 244 205 { Start-Process $Console }
$null = Add-Button 'Open the log' 16 288 205 { if (Test-Path $Log) { Start-Process notepad.exe $Log } }
$null = Add-Button 'Check every agent' 231 288 205 {
  Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd '$Repo'; python tools\local-manager\manager.py --selftest"
  $status.Text = 'The agent check runs in its own window. It takes about a minute.'
}

$stopOllama = New-Object System.Windows.Forms.CheckBox
$stopOllama.Text = 'Also stop Ollama when I stop for the night (frees the GPUs)'
$stopOllama.Location = New-Object System.Drawing.Point(16, 336); $stopOllama.Size = New-Object System.Drawing.Size(420, 40)
$form.Controls.Add($stopOllama)

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 8000
$timer.Add_Tick({ Update-Status })
$form.Add_Shown({ Update-Status; $timer.Start() })
$form.Add_FormClosed({ $timer.Stop() })
[void]$form.ShowDialog()
