param(
  [ValidateSet("major", "minor", "patch")]
  [string]$Part = "patch"
)

$versionPath = Join-Path $PSScriptRoot "..\version.json"
$serviceWorkerPath = Join-Path $PSScriptRoot "..\sw.js"
$indexPath = Join-Path $PSScriptRoot "..\index.html"
$versionData = Get-Content -Raw $versionPath | ConvertFrom-Json
$current = [version]$versionData.version

switch ($Part) {
  "major" { $next = [version]::new($current.Major + 1, 0, 0) }
  "minor" { $next = [version]::new($current.Major, $current.Minor + 1, 0) }
  default { $next = [version]::new($current.Major, $current.Minor, $current.Build + 1) }
}

@{ version = $next.ToString() } | ConvertTo-Json | Set-Content -Path $versionPath -Encoding utf8
$serviceWorker = Get-Content -Raw $serviceWorkerPath
$serviceWorker = [regex]::Replace($serviceWorker, 'precio-luz-shell-v[0-9]+\.[0-9]+\.[0-9]+', "precio-luz-shell-v$next", 1)
Set-Content -Path $serviceWorkerPath -Value $serviceWorker -Encoding utf8
$index = Get-Content -Raw $indexPath
$replacement = '${1}' + $next + '${2}'
$index = [regex]::Replace($index, '(<span class="app-version" id="app-version">)v?[0-9]+\.[0-9]+\.[0-9]+(</span>)', $replacement, 1)
Set-Content -Path $indexPath -Value $index -Encoding utf8
Write-Output "Versión actualizada a $next"
