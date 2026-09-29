$ErrorActionPreference = "Stop"
$exe = Join-Path $PSScriptRoot "../dist/FlowPlan2.exe"
$url = "http://127.0.0.1:4175/"
$process = Start-Process -FilePath $exe -ArgumentList "--no-browser" -PassThru -WindowStyle Hidden

try {
  $ready = $false
  for ($attempt = 0; $attempt -lt 40; $attempt++) {
    Start-Sleep -Milliseconds 250
    try {
      $response = Invoke-WebRequest -Uri $url -SkipHttpErrorCheck
      if ($response.StatusCode -eq 200) {
        $ready = $true
        break
      }
    } catch {}
    if ($process.HasExited) { break }
  }
  if (-not $ready) { throw "FlowPlan2.exe did not start its local server." }
  if ($response.Content -notmatch "FlowPlan") { throw "The embedded index.html was not served." }
  if ($response.Headers["Cache-Control"] -ne "no-store") { throw "Static assets may be cached across releases." }

  $script = Invoke-WebRequest -Uri "${url}js/main/main.js" -SkipHttpErrorCheck
  if ($script.StatusCode -ne 200 -or $script.Content -notmatch "FlowPlan") {
    throw "The application JavaScript was not served."
  }

  $missing = Invoke-WebRequest -Uri "${url}not-present.txt" -SkipHttpErrorCheck
  if ($missing.StatusCode -ne 404) { throw "An unknown asset was served." }

  $second = Start-Process -FilePath $exe -ArgumentList "--no-browser" -PassThru -Wait -WindowStyle Hidden
  if ($second.ExitCode -ne 1) { throw "A second instance did not reject the occupied port." }
  Write-Host "FlowPlan2.exe served its embedded assets and rejected a second instance."
} finally {
  if (-not $process.HasExited) {
    Stop-Process -Id $process.Id
    $process.WaitForExit()
  }
}
