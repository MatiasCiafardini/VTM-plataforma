$ErrorActionPreference = 'Stop'

$script:RootDir = Split-Path -Parent $PSScriptRoot
$script:RuntimeDir = Join-Path $script:RootDir '.local-runtime'
$script:LogsDir = Join-Path $script:RuntimeDir 'logs'
$script:StateDir = Join-Path $script:RuntimeDir 'state'

$script:PgCtl = 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe'

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

function Initialize-RuntimeDirectories {
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

function Get-LogPathStateFile {
  param(
    [string]$Name,
    [string]$Kind
  )
  Join-Path $script:StateDir "$Name.$Kind.path"
}

function Get-ResolvedLogFilePath {
  param([string]$Name)
  $stateFile = Get-LogPathStateFile -Name $Name -Kind 'log'
  if (Test-Path $stateFile) {
    $storedPath = (Get-Content $stateFile -Raw -ErrorAction SilentlyContinue).Trim()
    if ($storedPath) { return $storedPath }
  }
  return Get-LogFilePath -Name $Name
}

function Set-ResolvedLogFilePath {
  param([string]$Name, [string]$Path)
  Set-Content -Path (Get-LogPathStateFile -Name $Name -Kind 'log') -Value $Path
}

function Get-ResolvedErrorLogFilePath {
  param([string]$Name)
  $stateFile = Get-LogPathStateFile -Name $Name -Kind 'error'
  if (Test-Path $stateFile) {
    $storedPath = (Get-Content $stateFile -Raw -ErrorAction SilentlyContinue).Trim()
    if ($storedPath) { return $storedPath }
  }
  return Get-ErrorLogFilePath -Name $Name
}

function Set-ResolvedErrorLogFilePath {
  param([string]$Name, [string]$Path)
  Set-Content -Path (Get-LogPathStateFile -Name $Name -Kind 'error') -Value $Path
}

function Read-ServicePid {
  param([string]$Name)
  $pidFile = Get-PidFilePath -Name $Name
  if (-not (Test-Path $pidFile)) { return $null }
  $content = Get-Content $pidFile -Raw -ErrorAction SilentlyContinue
  if ($null -eq $content) { return $null }
  $raw = $content.Trim()
  if ([string]::IsNullOrWhiteSpace($raw)) { return $null }
  return [int]$raw
}

function Test-ProcessRunning {
  param([int]$ProcessId)
  try {
    $null = Get-Process -Id $ProcessId -ErrorAction Stop
    return $true
  }
  catch { return $false }
}

function Remove-ServicePidFile {
  param([string]$Name)
  $pidFile = Get-PidFilePath -Name $Name
  if (Test-Path $pidFile) { Remove-Item $pidFile -Force }
}

function Get-ListeningProcessIdForPort {
  param([int]$Port)
  $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if ($null -eq $connection) { return $null }
  return [int]$connection.OwningProcess
}

function Invoke-NativeCommandCapture {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,

    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  $previousNativePreference = $null
  $hadNativePreference = $false
  $previousErrorActionPreference = $ErrorActionPreference

  try {
    $ErrorActionPreference = 'Continue'

    if ($PSVersionTable.PSVersion.Major -ge 7) {
      $hadNativePreference = Test-Path variable:PSNativeCommandUseErrorActionPreference
      if ($hadNativePreference) {
        $previousNativePreference = $PSNativeCommandUseErrorActionPreference
      }
      $PSNativeCommandUseErrorActionPreference = $false
    }

    $output = & $FilePath @Arguments 2>&1 | Out-String
    return @{
      ExitCode = $LASTEXITCODE
      Output = $output.Trim()
    }
  }
  finally {
    $ErrorActionPreference = $previousErrorActionPreference

    if ($PSVersionTable.PSVersion.Major -ge 7) {
      if ($hadNativePreference) {
        $PSNativeCommandUseErrorActionPreference = $previousNativePreference
      }
      else {
        Remove-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue
      }
    }
  }
}

# Kill a PID and its entire child process tree using taskkill /T.
# Silently ignores errors (process already gone, etc.).
function Remove-ProcessTree {
  param([int]$ProcessId)
  & taskkill /F /T /PID $ProcessId 2>&1 | Out-Null
}

# Given a PID that is listening on a port, walk UP the process tree and kill
# the highest ancestor that is still a dev process (node / npm / powershell
# with our working directory).  Using /T on that ancestor kills the entire
# subtree - watcher + server - in one shot, preventing the watcher from
# respawning the server before we bind.
function Remove-PortOwnerTree {
  param([int]$PortOwnerPid)

  $devNames = @('node', 'npm', 'powershell', 'pwsh')
  $topPid = $PortOwnerPid

  # Walk up looking for the highest dev-process ancestor
  $currentPid = $PortOwnerPid
  $visited = @{}
  while ($true) {
    if ($visited.ContainsKey($currentPid)) { break }
    $visited[$currentPid] = $true

    $wmiProc = Get-CimInstance Win32_Process -Filter "ProcessId=$currentPid" -ErrorAction SilentlyContinue
    if ($null -eq $wmiProc) { break }

    $parentPid = [int]$wmiProc.ParentProcessId
    if ($parentPid -le 4) { break }  # PID 0/4 = System

    $parentProc = Get-Process -Id $parentPid -ErrorAction SilentlyContinue
    if ($null -eq $parentProc) { break }
    if ($parentProc.ProcessName -notin $devNames) { break }

    $topPid = $parentPid
    $currentPid = $parentPid
  }

  Remove-ProcessTree -ProcessId $topPid
}

function Wait-ForPortRelease {
  param(
    [int]$Port,
    [int]$TimeoutMs = 5000
  )

  $deadline = (Get-Date).AddMilliseconds($TimeoutMs)
  while ((Get-Date) -lt $deadline) {
    if (-not (Get-ListeningProcessIdForPort -Port $Port)) {
      return $true
    }
    Start-Sleep -Milliseconds 250
  }

  return -not (Get-ListeningProcessIdForPort -Port $Port)
}

function Stop-ServiceIfRunning {
  param([hashtable]$Service)
  $servicePid = Read-ServicePid -Name $Service.Name
  if (-not $servicePid) {
    $portOwner = Get-ListeningProcessIdForPort -Port $Service.Port
    if ($portOwner) {
      $ownerProc = Get-Process -Id $portOwner -ErrorAction SilentlyContinue
      $ownerName = if ($ownerProc) { $ownerProc.ProcessName } else { 'unknown' }
      if ($ownerName -in @('node', 'next-server', 'next', 'npm', 'powershell', 'pwsh')) {
        Remove-PortOwnerTree -PortOwnerPid $portOwner
        Wait-ForPortRelease -Port $Service.Port | Out-Null
        return $true
      }
    }
    return $false
  }
  if (Test-ProcessRunning -ProcessId $servicePid) {
    # Kill the entire process tree so the watcher does not respawn the server.
    Remove-ProcessTree -ProcessId $servicePid
    Wait-ForPortRelease -Port $Service.Port | Out-Null
  }
  else {
    $portOwner = Get-ListeningProcessIdForPort -Port $Service.Port
    if ($portOwner) {
      $ownerProc = Get-Process -Id $portOwner -ErrorAction SilentlyContinue
      $ownerName = if ($ownerProc) { $ownerProc.ProcessName } else { 'unknown' }
      if ($ownerName -in @('node', 'next-server', 'next', 'npm', 'powershell', 'pwsh')) {
        Remove-PortOwnerTree -PortOwnerPid $portOwner
        Wait-ForPortRelease -Port $Service.Port | Out-Null
      }
    }
  }
  Remove-ServicePidFile -Name $Service.Name
  return $true
}

function Reset-FileIfPossible {
  param([string]$Path)
  if (-not (Test-Path $Path)) { return }
  $deadline = (Get-Date).AddSeconds(5)
  $lastError = $null
  while ((Get-Date) -lt $deadline) {
    try {
      Remove-Item $Path -Force -ErrorAction Stop
      return
    }
    catch {
      $lastError = $_
      Start-Sleep -Milliseconds 250
    }
  }
  try {
    Clear-Content $Path -Force -ErrorAction Stop
  }
  catch {
    if ($lastError) { throw $lastError }
    throw
  }
}

# Wait for a port to start listening, showing progress dots every 5s.
# Increased to 120s (NestJS + Next.js first compile can take 60-90s).
function Wait-ForServicePort {
  param(
    [hashtable]$Service,
    [int]$TimeoutMs = 120000
  )

  $deadline = (Get-Date).AddMilliseconds($TimeoutMs)
  $ticks = 0

  Write-Host -NoNewline "  Esperando $($Service.Name) en :$($Service.Port)"

  while ((Get-Date) -lt $deadline) {
    $portOwner = Get-ListeningProcessIdForPort -Port $Service.Port
    if ($portOwner) {
      Write-Host ' listo.'
      return $portOwner
    }
    Start-Sleep -Milliseconds 1000
    $ticks++
    if ($ticks % 5 -eq 0) { Write-Host -NoNewline '.' }
  }

  Write-Host ' tiempo agotado.'
  return $null
}

# ---- Database ---------------------------------------------------------------
# Calls pg_ctl directly - avoids the npm -> powershell -> pg_ctl pipe hang.

function Start-BackendDatabase {
  $backendDir = Join-Path $script:RootDir 'tattoo-platform-backend'
  $databasePort = 5433
  $pgDataDir = Join-Path $backendDir '.postgres\data'
  $startupDeadline = (Get-Date).AddSeconds(25)

  if (-not (Test-Path $script:PgCtl)) {
    throw "No encontre pg_ctl en '$($script:PgCtl)'. Verifica que PostgreSQL 18 este instalado."
  }

  # Already listening on the port? Done.
  if (Get-ListeningProcessIdForPort -Port $databasePort) {
    Write-Host '  Base de datos ya en ejecucion.'
    return
  }

  # pg_ctl status is the authoritative check (exit 0 = running).
  $status = Invoke-NativeCommandCapture -FilePath $script:PgCtl -Arguments @('-D', $pgDataDir, 'status')
  if ($status.ExitCode -eq 0) {
    Write-Host '  Base de datos ya en ejecucion.'
    return
  }

  Write-Host -NoNewline '  Iniciando base de datos'

  # Launch pg_ctl fire-and-forget (no -Wait) so that postgres inheriting the
  # file handles does not block us. The port poll below is the readiness gate.
  # ArgumentList as a single string to preserve quoting around the -o value.
  $tmpStdout = [System.IO.Path]::GetTempFileName()
  $tmpStderr = [System.IO.Path]::GetTempFileName()
  $pgCtlArgs = "-D `"$pgDataDir`" -o `"-p 5433 -h 127.0.0.1`" start -W"
  $null = Start-Process -FilePath $script:PgCtl `
    -ArgumentList $pgCtlArgs `
    -NoNewWindow `
    -RedirectStandardOutput $tmpStdout -RedirectStandardError $tmpStderr

  # Poll until the port is listening or we time out.
  while ((Get-Date) -lt $startupDeadline) {
    if (Get-ListeningProcessIdForPort -Port $databasePort) {
      Write-Host ' lista.'
      Remove-Item $tmpStdout, $tmpStderr -Force -ErrorAction SilentlyContinue
      return
    }
    Start-Sleep -Milliseconds 500
    Write-Host -NoNewline '.'
  }

  # Final authoritative check via pg_ctl status.
  $status = Invoke-NativeCommandCapture -FilePath $script:PgCtl -Arguments @('-D', $pgDataDir, 'status')
  if ($status.ExitCode -eq 0) {
    Write-Host ' lista.'
    Remove-Item $tmpStdout, $tmpStderr -Force -ErrorAction SilentlyContinue
    return
  }

  $outText = if (Test-Path $tmpStdout) { "$([System.IO.File]::ReadAllText($tmpStdout))" } else { '' }
  $errText = if (Test-Path $tmpStderr) { "$([System.IO.File]::ReadAllText($tmpStderr))" } else { '' }
  $startOut = "$outText $errText".Trim()
  Remove-Item $tmpStdout, $tmpStderr -Force -ErrorAction SilentlyContinue
  throw "No pude iniciar PostgreSQL (el puerto $databasePort no quedo escuchando).`nOutput de inicio: $startOut"
}

function Stop-BackendDatabase {
  if (-not (Test-Path $script:PgCtl)) { return }
  $backendDir = Join-Path $script:RootDir 'tattoo-platform-backend'
  $pgDataDir = Join-Path $backendDir '.postgres\data'

  try {
    $result = Invoke-NativeCommandCapture -FilePath $script:PgCtl -Arguments @('-D', $pgDataDir, 'stop')
    $out = $result.Output
    if ($result.ExitCode -ne 0) {
      $msg = "$out"
      if ($msg -notmatch 'no se est. ejecutando|is not running|no server running|postmaster\.pid|no existe') {
        throw $msg
      }
    }
  }
  catch {
    $msg = $_ | Out-String
    if ($msg -notmatch 'no se est. ejecutando|is not running|no server running|postmaster\.pid|no existe') {
      throw
    }
  }
}

# ---- Service launch (two-phase) ---------------------------------------------
#
# Phase 1 - Invoke-ServiceLaunch  : starts background process, saves wrapper PID.
# Phase 2 - Confirm-ServiceReady  : waits for port to be listening.
#
# Splitting into two phases lets all services compile in parallel.
# The wrapper PID is saved immediately so Stop-ServiceIfRunning can later
# kill the entire tree (watcher + server) with taskkill /T.

function Invoke-ServiceLaunch {
  param([hashtable]$Service)

  $workingDirectory = $Service.WorkingDirectory
  if (-not (Test-Path $workingDirectory)) {
    throw "No encontre la carpeta del servicio '$($Service.Name)' en $workingDirectory"
  }

  # Kill the tracked process tree if it's still alive.
  Stop-ServiceIfRunning -Service $Service | Out-Null

  # Kill any untracked process still on our port.
  # Walk up the tree so the watcher dies together with the server.
  $portOwner = Get-ListeningProcessIdForPort -Port $Service.Port
  if ($portOwner) {
    $ownerProc = Get-Process -Id $portOwner -ErrorAction SilentlyContinue
    $ownerName = if ($ownerProc) { $ownerProc.ProcessName } else { 'unknown' }

    $isOurProcess = $ownerName -in @('node', 'next-server', 'next', 'npm')
    if ($isOurProcess) {
      Write-Host "  Puerto $($Service.Port) ocupado por '$ownerName' (PID $portOwner) - deteniendo arbol..."
      Remove-PortOwnerTree -PortOwnerPid $portOwner

      # Wait up to 5s for the port to be fully released (and confirm it
      # doesn't get re-bound by a surviving watcher within that window).
      $freed = $false
      $deadline = (Get-Date).AddSeconds(5)
      while ((Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 500
        $stillOwner = Get-ListeningProcessIdForPort -Port $Service.Port
        if (-not $stillOwner) { $freed = $true; break }
        # Port re-appeared - kill whatever grabbed it (watcher respawn race)
        Remove-PortOwnerTree -PortOwnerPid $stillOwner
      }

      if (-not $freed) {
        if (Get-ListeningProcessIdForPort -Port $Service.Port) {
          throw "No pude liberar el puerto $($Service.Port). Intentalo manualmente."
        }
      }
    } else {
      throw "El puerto $($Service.Port) esta ocupado por '$ownerName' (PID $portOwner), que no parece ser un proceso de dev. Liberalo manualmente antes de correr dev:up."
    }
  }

  $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $logFile = Join-Path $script:LogsDir "$($Service.Name)-$timestamp.log"
  $errorLogFile = Join-Path $script:LogsDir "$($Service.Name)-$timestamp.error.log"
  Set-ResolvedLogFilePath -Name $Service.Name -Path $logFile
  Set-ResolvedErrorLogFilePath -Name $Service.Name -Path $errorLogFile

  $wrappedCommand = "Set-Location '$workingDirectory'; $($Service.Command)"

  $process = Start-Process powershell -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $wrappedCommand
  ) -WorkingDirectory $workingDirectory -WindowStyle Hidden `
    -RedirectStandardOutput $logFile -RedirectStandardError $errorLogFile -PassThru

  # Save the wrapper PID immediately so future dev:up / dev:down can
  # kill the entire tree (powershell -> npm -> node watcher -> node server).
  Set-Content -Path (Get-PidFilePath -Name $Service.Name) -Value $process.Id

  # Brief pause to detect an immediate crash before moving on.
  Start-Sleep -Milliseconds 800

  if ($process.HasExited) {
    $logText = if (Test-Path $logFile) { Get-Content $logFile -Raw } else { '' }
    $errText = if (Test-Path $errorLogFile) { Get-Content $errorLogFile -Raw } else { '' }
    throw "El servicio '$($Service.Name)' termino apenas arranco.`n$logText`n$errText"
  }

  Write-Host "  $($Service.Name) arrancando (PID $($process.Id))..."

  return @{
    Service      = $Service
    Process      = $process
    LogFile      = $logFile
    ErrorLogFile = $errorLogFile
  }
}

function Confirm-ServiceReady {
  param([hashtable]$Launch)

  $service = $Launch.Service

  if ($Launch.Process.HasExited) {
    $logText = if (Test-Path $Launch.LogFile) { Get-Content $Launch.LogFile -Raw } else { '' }
    $errText = if (Test-Path $Launch.ErrorLogFile) { Get-Content $Launch.ErrorLogFile -Raw } else { '' }
    throw "El servicio '$($service.Name)' murio antes de estar listo.`n$logText`n$errText"
  }

  $portPid = Wait-ForServicePort -Service $service

  if (-not $portPid) {
    $logText = if (Test-Path $Launch.LogFile) { Get-Content $Launch.LogFile -Raw } else { '' }
    $errText = if (Test-Path $Launch.ErrorLogFile) { Get-Content $Launch.ErrorLogFile -Raw } else { '' }
    throw "El servicio '$($service.Name)' no quedo escuchando en el puerto $($service.Port) despues de 120s.`n`n--- log ---`n$logText`n--- error ---`n$errText"
  }

  # PID file already has the wrapper PID (saved in Invoke-ServiceLaunch).
  # No need to overwrite it.

  return @{
    Name    = $service.Name
    Pid     = $Launch.Process.Id
    LogFile = $Launch.LogFile
    Url     = $service.Url
  }
}

# Kept for backward compatibility (dev-status / dev-down don't use this).
function Start-ServiceProcess {
  param([hashtable]$Service)
  $launch = Invoke-ServiceLaunch -Service $Service
  return Confirm-ServiceReady -Launch $launch
}

# ---- Status helper ----------------------------------------------------------

function Get-ServiceStatus {
  param([hashtable]$Service)

  $servicePid = Read-ServicePid -Name $Service.Name
  if (-not $servicePid) {
    $externalOwner = Get-ListeningProcessIdForPort -Port $Service.Port
    return [pscustomobject]@{
      Name    = $Service.Name
      Status  = 'stopped'
      Pid     = $null
      LogFile = Get-ResolvedLogFilePath -Name $Service.Name
      Url     = $Service.Url
      Note    = if ($externalOwner) { "port-busy:$externalOwner" } else { $null }
    }
  }

  if (-not (Test-ProcessRunning -ProcessId $servicePid)) {
    Remove-ServicePidFile -Name $Service.Name
    $externalOwner = Get-ListeningProcessIdForPort -Port $Service.Port
    return [pscustomobject]@{
      Name    = $Service.Name
      Status  = 'stopped'
      Pid     = $null
      LogFile = Get-ResolvedLogFilePath -Name $Service.Name
      Url     = $Service.Url
      Note    = if ($externalOwner) { "port-busy:$externalOwner" } else { $null }
    }
  }

  return [pscustomobject]@{
    Name    = $Service.Name
    Status  = 'running'
    Pid     = $servicePid
    LogFile = Get-ResolvedLogFilePath -Name $Service.Name
    Url     = $Service.Url
    Note    = $null
  }
}
