. (Join-Path $PSScriptRoot 'dev-common.ps1')

Ensure-RuntimeDirectories
Start-BackendDatabase

$results = foreach ($service in $script:Services) {
  Start-ServiceProcess -Service $service
}

foreach ($result in $results) {
  Write-Host "$($result.Name) iniciado con PID $($result.Pid). Logs: $($result.LogFile)"
}

Write-Host ''
Write-Host 'URLs locales:'
Write-Host '- Backend: http://localhost:3004/docs'
Write-Host '- Frontend: http://localhost:3005'
Write-Host ''
Write-Host 'Para revisar procesos: npm run dev:status'
Write-Host 'Para apagarlos: npm run dev:down'
