$ErrorActionPreference = 'Stop'
$exe = Join-Path $PSScriptRoot '../../dist-v2/FlowPlan2-V2.exe'
$url = 'http://127.0.0.1:4275/'
$process = Start-Process -FilePath $exe -ArgumentList '--no-browser' -PassThru
try {
  $ready = $false
  for ($i = 0; $i -lt 50; $i++) {
    if ($process.HasExited) { throw 'V2 SEA exited before readiness' }
    try { $page = Invoke-WebRequest -Uri $url -UseBasicParsing; $ready = $true; break } catch { Start-Sleep -Milliseconds 100 }
  }
  if (-not $ready) { throw 'V2 SEA did not bind 4275' }
  if ($page.Content -notmatch 'FlowPlan2 V2') { throw 'Wrong SEA payload' }
  node (Join-Path $PSScriptRoot 'browser-isolation-test.mjs') --sea-running
  if ($LASTEXITCODE -ne 0) { throw 'Real SEA browser isolation failed' }
} finally {
  if (-not $process.HasExited) { Stop-Process -Id $process.Id; $process.WaitForExit() }
}
try { Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 1 | Out-Null; throw '4275 still responds after SEA stopped' } catch {
  if ($_.Exception.Message -eq '4275 still responds after SEA stopped') { throw }
}
Write-Output 'Real Windows V2 SEA smoke PASS'
