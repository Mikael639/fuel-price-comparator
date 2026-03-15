[CmdletBinding()]
param(
  [string]$Server = $(if ($env:FUELFLASH_DEPLOY_SERVER) { $env:FUELFLASH_DEPLOY_SERVER } else { "" }),
  [switch]$DryRun,
  [string]$KeyPath = $(if ($env:FUELFLASH_DEPLOY_KEY) {
      $env:FUELFLASH_DEPLOY_KEY
    } else {
      ""
    }),
  [string]$RemoteDeployCommand = $(if ($env:FUELFLASH_DEPLOY_COMMAND) {
      $env:FUELFLASH_DEPLOY_COMMAND
    } else {
      "/home/ubuntu/deploy/deploy.sh"
    })
)

$ErrorActionPreference = "Stop"

$scriptRoot = if ($PSScriptRoot) {
  $PSScriptRoot
} elseif ($PSCommandPath) {
  Split-Path -Parent $PSCommandPath
} else {
  Join-Path (Get-Location).Path "scripts"
}

$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptRoot ".."))

if ([string]::IsNullOrWhiteSpace($KeyPath)) {
  throw "FUELFLASH_DEPLOY_KEY or -KeyPath is required."
}

if ([string]::IsNullOrWhiteSpace($Server)) {
  throw "FUELFLASH_DEPLOY_SERVER or -Server is required."
}

$archivePath = Join-Path $repoRoot "dist.tar.gz"

if (!(Test-Path $KeyPath)) {
  throw "SSH key not found: $KeyPath"
}

if ($DryRun) {
  Write-Host "Repo root: $repoRoot"
  Write-Host "SSH key: $KeyPath"
  Write-Host "Archive: $archivePath"
  Write-Host "Server: $Server"
  Write-Host "Remote command: $RemoteDeployCommand"
  exit 0
}

Push-Location $repoRoot
try {
  npm run build

  if (Test-Path $archivePath) {
    Remove-Item $archivePath -Force
  }

  tar -czf $archivePath dist
  scp -i $KeyPath $archivePath "${Server}:/home/ubuntu/deploy/dist.tar.gz"
  ssh -i $KeyPath $Server $RemoteDeployCommand
} finally {
  Pop-Location
}
