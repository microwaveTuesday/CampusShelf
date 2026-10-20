$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try { python scripts/dev.py start; if ($LASTEXITCODE -ne 0) { throw 'Startup failed; inspect .runtime logs.' } }
finally { Pop-Location }
