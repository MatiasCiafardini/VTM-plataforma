. (Join-Path $PSScriptRoot 'dev-common.ps1')

Initialize-RuntimeDirectories

$statuses = foreach ($service in $script:Services) {
  Get-ServiceStatus -Service $service
}

foreach ($status in $statuses) {
  if ($status.Status -eq 'running') {
    Write-Host "$($status.Name): RUNNING (PID $($status.Pid))"
  }
  else {
    Write-Host "$($status.Name): STOPPED"
  }

  if ($status.Note) {
    Write-Host "  Note: $($status.Note)"
  }

  Write-Host "  Log: $($status.LogFile)"
  Write-Host "  URL: $($status.Url)"
}
