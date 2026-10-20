$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try { python scripts/dev.py stop }
finally { Pop-Location }
