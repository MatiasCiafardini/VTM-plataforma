. (Join-Path $PSScriptRoot 'dev-common.ps1')

Initialize-RuntimeDirectories

Write-Host ''
Start-BackendDatabase

# ── Phase 1: launch all services in background simultaneously ──────────────
# Both backend and frontend start compiling at the same time, cutting total
# wait time roughly in half compared to starting them sequentially.
Write-Host ''
Write-Host 'Lanzando servicios...'
$launches = foreach ($service in $script:Services) {
  Invoke-ServiceLaunch -Service $service
}

# ── Phase 2: wait for each port (up to 120s each) ─────────────────────────
Write-Host ''
Write-Host 'Esperando que los servicios queden listos'
Write-Host '(la primera vez puede tomar hasta 2 minutos mientras compilan)'
Write-Host ''
$results = foreach ($launch in $launches) {
  Confirm-ServiceReady -Launch $launch
}

# ── Summary ────────────────────────────────────────────────────────────────
Write-Host ''
foreach ($result in $results) {
  Write-Host "$($result.Name) listo  PID $($result.Pid)  $($result.Url)"
  Write-Host "  Logs: $($result.LogFile)"
}

Write-Host ''
Write-Host 'Para revisar estado: npm run dev:status'
Write-Host 'Para apagar todo:    npm run dev:down'
Write-Host ''
