# HFB Control

A small window for the owner's PC: start, stop and check the local manager without typing commands.

Set up once, in PowerShell:

```
cd C:\Users\Patrick\Documents\hplc-figure-bench
powershell -ExecutionPolicy Bypass -File tools\control\install-shortcut.ps1
```

That puts **HFB Control** on the desktop. It shows whether the manager, Ollama and the console page are running, plus the newest log line, refreshed every few seconds. Buttons: **Start everything**, **Stop for the night** (optionally Ollama too, to free the GPUs), **Update and restart** (git pull, then restart the manager), **Open Mission Control**, **Open the log** and **Check every agent** (`manager.py --selftest`).

It only starts and stops programs on this PC. The manager still starts by itself at login from the Startup folder.
