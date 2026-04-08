. (Join-Path $PSScriptRoot 'dev-common.ps1')

$stoppedAny = $false

foreach ($service in $script:Services) {
  $wasStopped = Stop-ServiceIfRunning -Service $service
  if ($wasStopped) {
    Write-Host "$($service.Name) detenido."
    $stoppedAny = $true
  }
  else {
    Write-Host "$($service.Name) ya estaba apagado."
  }
}

Stop-BackendDatabase
Write-Host 'base de datos local detenida.'

if (-not $stoppedAny) {
  Write-Host 'No habia procesos del runtime local activos.'
}
