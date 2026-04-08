param(
  [switch]$WithWindows
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root 'tattoo-platform-backend'
$frontendDir = Join-Path $root 'tattoo-platform-frontend'

if (-not (Test-Path $backendDir)) {
  throw "No encontre la carpeta del backend en $backendDir"
}

if (-not (Test-Path $frontendDir)) {
  throw "No encontre la carpeta del frontend en $frontendDir"
}

function Invoke-InDirectory {
  param(
    [string]$WorkingDirectory,
    [string]$Command
  )

  Push-Location $WorkingDirectory
  try {
    Invoke-Expression $Command
  }
  finally {
    Pop-Location
  }
}

function Start-HiddenProcess {
  param(
    [string]$WorkingDirectory,
    [string]$Command
  )

  Start-Process powershell -ArgumentList @(
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    "Set-Location '$WorkingDirectory'; $Command"
  ) -WindowStyle Hidden | Out-Null
}

function Start-InWindow {
  param(
    [string]$WorkingDirectory,
    [string]$Title,
    [string]$Command
  )

  $windowCommand = @"
`$Host.UI.RawUI.WindowTitle = '$Title'
Set-Location '$WorkingDirectory'
Write-Host 'Iniciando $Title...' -ForegroundColor Cyan
$Command
"@

  Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    $windowCommand
  ) | Out-Null
}

Write-Host 'Iniciando base local de PostgreSQL...' -ForegroundColor Yellow
try {
  Invoke-InDirectory -WorkingDirectory $backendDir -Command 'npm run db:start'
}
catch {
  $message = $_.Exception.Message
  if ($message -notmatch 'servidor est. en ejecuci.n' -and $message -notmatch 'server is running') {
    throw
  }
}

if ($WithWindows) {
  Write-Host 'Abriendo backend en una ventana nueva...' -ForegroundColor Yellow
  Start-InWindow -WorkingDirectory $backendDir -Title 'Tattoo Backend' -Command 'npm run start:dev'

  Write-Host 'Abriendo frontend en una ventana nueva...' -ForegroundColor Yellow
  Start-InWindow -WorkingDirectory $frontendDir -Title 'Tattoo Frontend' -Command 'npm run dev'
}
else {
  Write-Host 'Levantando backend y frontend en segundo plano...' -ForegroundColor Yellow
  Start-HiddenProcess -WorkingDirectory $backendDir -Command 'npm run start:dev'
  Start-HiddenProcess -WorkingDirectory $frontendDir -Command 'npm run dev'
}

Write-Host ''
Write-Host 'Entorno inicializado.' -ForegroundColor Green
Write-Host 'Frontend: http://localhost:3005' -ForegroundColor Green
Write-Host 'Backend Swagger: http://localhost:3004/docs' -ForegroundColor Green
Write-Host ''
Write-Host 'Credenciales demo:' -ForegroundColor Cyan
Write-Host 'admin@tattoo-platform.local / Admin12345!'
Write-Host 'student@tattoo-platform.local / Student12345!'
