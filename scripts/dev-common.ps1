$ErrorActionPreference = 'Stop'

$script:RootDir = Split-Path -Parent $PSScriptRoot
$script:RuntimeDir = Join-Path $script:RootDir '.local-runtime'
$script:LogsDir = Join-Path $script:RuntimeDir 'logs'
$script:StateDir = Join-Path $script:RuntimeDir 'state'

$script:Services = @(
  @{
    Name = 'backend'
    WorkingDirectory = Join-Path $script:RootDir 'tattoo-platform-backend'
    Command = 'npm run start:dev'
    Url = 'http://localhost:3004/docs'
    Port = 3004
  },
  @{
    Name = 'frontend'
    WorkingDirectory = Join-Path $script:RootDir 'tattoo-platform-frontend'
    Command = 'npm run dev'
    Url = 'http://localhost:3005'
    Port = 3005
  }
)

function Ensure-RuntimeDirectories {
  foreach ($path in @($script:RuntimeDir, $script:LogsDir, $script:StateDir)) {
    if (-not (Test-Path $path)) {
      New-Item -ItemType Directory -Path $path | Out-Null
    }
  }
}

function Get-PidFilePath {
  param([string]$Name)
  Join-Path $script:StateDir "$Name.pid"
}

function Get-LogFilePath {
  param([string]$Name)
  Join-Path $script:LogsDir "$Name.log"
}

function Get-ErrorLogFilePath {
  param([string]$Name)
  Join-Path $script:LogsDir "$Name.error.log"
}

function Read-ServicePid {
  param([string]$Name)
  $pidFile = Get-PidFilePath -Name $Name
  if (-not (Test-Path $pidFile)) {
    return $null
  }

  $content = Get-Content $pidFile -Raw -ErrorAction SilentlyContinue
  if ($null -eq $content) {
    return $null
  }

  $raw = $content.Trim()
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return $null
  }

  return [int]$raw
}

function Test-ProcessRunning {
  param([int]$ProcessId)
  try {
    $null = Get-Process -Id $ProcessId -ErrorAction Stop
    return $true
  }
  catch {
    return $false
  }
}

function Remove-ServicePidFile {
  param([string]$Name)
  $pidFile = Get-PidFilePath -Name $Name
  if (Test-Path $pidFile) {
    Remove-Item $pidFile -Force
  }
}

function Get-ListeningProcessIdForPort {
  param([int]$Port)

  $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1

  if ($null -eq $connection) {
    return $null
  }

  return [int]$connection.OwningProcess
}

function Stop-ServiceIfRunning {
  param([hashtable]$Service)
  $servicePid = Read-ServicePid -Name $Service.Name

  if (-not $servicePid) {
    return $false
  }

  if (Test-ProcessRunning -ProcessId $servicePid) {
    Stop-Process -Id $servicePid -Force
  }

  Remove-ServicePidFile -Name $Service.Name
  return $true
}

function Wait-ForServicePort {
  param(
    [hashtable]$Service,
    [int]$TimeoutMs = 30000
  )

  $deadline = (Get-Date).AddMilliseconds($TimeoutMs)

  while ((Get-Date) -lt $deadline) {
    $portOwner = Get-ListeningProcessIdForPort -Port $Service.Port
    if ($portOwner) {
      return $portOwner
    }

    Start-Sleep -Milliseconds 500
  }

  return $null
}

function Start-ServiceProcess {
  param([hashtable]$Service)

  $workingDirectory = $Service.WorkingDirectory
  if (-not (Test-Path $workingDirectory)) {
    throw "No encontre la carpeta del servicio $($Service.Name) en $workingDirectory"
  }

  Stop-ServiceIfRunning -Service $Service | Out-Null

  $portOwner = Get-ListeningProcessIdForPort -Port $Service.Port
  if ($portOwner) {
    throw "El puerto $($Service.Port) ya esta ocupado por un proceso externo (PID $portOwner). Liberalo antes de correr dev:up."
  }

  $logFile = Get-LogFilePath -Name $Service.Name
  $errorLogFile = Get-ErrorLogFilePath -Name $Service.Name
  if (Test-Path $logFile) {
    Remove-Item $logFile -Force
  }
  if (Test-Path $errorLogFile) {
    Remove-Item $errorLogFile -Force
  }

  $wrappedCommand = "Set-Location '$workingDirectory'; $($Service.Command)"

  $process = Start-Process powershell -ArgumentList @(
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    $wrappedCommand
  ) -WorkingDirectory $workingDirectory -WindowStyle Hidden -RedirectStandardOutput $logFile -RedirectStandardError $errorLogFile -PassThru

  Start-Sleep -Milliseconds 600

  if ($process.HasExited) {
    $logText = if (Test-Path $logFile) { Get-Content $logFile -Raw } else { '' }
    $errorText = if (Test-Path $errorLogFile) { Get-Content $errorLogFile -Raw } else { '' }
    throw "El servicio $($Service.Name) termino apenas arranco.`n$logText`n$errorText"
  }

  $trackedPid = Wait-ForServicePort -Service $Service

  if (-not $trackedPid) {
    $logText = if (Test-Path $logFile) { Get-Content $logFile -Raw } else { '' }
    $errorText = if (Test-Path $errorLogFile) { Get-Content $errorLogFile -Raw } else { '' }
    throw "El servicio $($Service.Name) no quedo escuchando en el puerto $($Service.Port).`n$logText`n$errorText"
  }

  Set-Content -Path (Get-PidFilePath -Name $Service.Name) -Value $trackedPid

  return @{
    Name = $Service.Name
    Pid = $trackedPid
    LogFile = $logFile
  }
}

function Start-BackendDatabase {
  $backendDir = Join-Path $script:RootDir 'tattoo-platform-backend'

  try {
    Push-Location $backendDir
    $statusOutput = npm run db:status 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0 -and $statusOutput -match 'en ejecuci.n|is running') {
      return
    }

    if (Get-ListeningProcessIdForPort -Port 5433) {
      return
    }

    $startOutput = npm run db:start 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) {
      throw $startOutput.Trim()
    }

    $finalStatusOutput = npm run db:status 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0 -and $finalStatusOutput -match 'en ejecuci.n|is running') {
      return
    }

    if (
      $startOutput -match 'otro servidor puede estar en ejecuci.n|server might be running' -or
      $startOutput -match 'servidor est. en ejecuci.n|server is running'
    ) {
      return
    }

    throw "No pude confirmar que PostgreSQL haya quedado en ejecucion.`n$startOutput`n$finalStatusOutput"
  }
  catch {
    $message = $_.Exception.Message
    if (
      $message -notmatch 'servidor est. en ejecuci.n' -and
      $message -notmatch 'server is running' -and
      $message -notmatch 'otro servidor puede estar en ejecuci.n' -and
      $message -notmatch 'server might be running'
    ) {
      throw
    }
  }
  finally {
    Pop-Location
  }
}

function Stop-BackendDatabase {
  $backendDir = Join-Path $script:RootDir 'tattoo-platform-backend'

  try {
    Push-Location $backendDir
    npm run db:stop | Out-Null
  }
  catch {
    $message = $_.Exception.Message
    if (
      $message -notmatch 'no se est. ejecutando' -and
      $message -notmatch 'is not running'
    ) {
      throw
    }
  }
  finally {
    Pop-Location
  }
}

function Get-ServiceStatus {
  param([hashtable]$Service)

  $servicePid = Read-ServicePid -Name $Service.Name
  if (-not $servicePid) {
    $externalOwner = Get-ListeningProcessIdForPort -Port $Service.Port
    return [pscustomobject]@{
      Name = $Service.Name
      Status = 'stopped'
      Pid = $null
      LogFile = Get-LogFilePath -Name $Service.Name
      Url = $Service.Url
      Note = if ($externalOwner) { "port-busy:$externalOwner" } else { $null }
    }
  }

  if (-not (Test-ProcessRunning -ProcessId $servicePid)) {
    Remove-ServicePidFile -Name $Service.Name
    $externalOwner = Get-ListeningProcessIdForPort -Port $Service.Port
    return [pscustomobject]@{
      Name = $Service.Name
      Status = 'stopped'
      Pid = $null
      LogFile = Get-LogFilePath -Name $Service.Name
      Url = $Service.Url
      Note = if ($externalOwner) { "port-busy:$externalOwner" } else { $null }
    }
  }

  return [pscustomobject]@{
    Name = $Service.Name
    Status = 'running'
    Pid = $servicePid
    LogFile = Get-LogFilePath -Name $Service.Name
    Url = $Service.Url
    Note = $null
  }
}
