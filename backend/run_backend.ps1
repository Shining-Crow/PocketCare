# Runs PocketCare backend using the project virtual environment.
# Usage (PowerShell):
#   cd backend
#   .\run_backend.ps1

$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$venvPython = Join-Path $root '.venv\Scripts\python.exe'

if (-not (Test-Path $venvPython)) {
  Write-Host "ERROR: venv python not found at $venvPython" -ForegroundColor Red
  Write-Host "Create it first: python -m venv .venv" -ForegroundColor Yellow
  exit 1
}

Write-Host "Using: $venvPython" -ForegroundColor Cyan
& $venvPython -m pip install -r (Join-Path $PSScriptRoot 'requirements.txt')
& $venvPython (Join-Path $PSScriptRoot 'app.py')
