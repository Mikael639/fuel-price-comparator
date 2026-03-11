[CmdletBinding()]
param(
  [string]$Server = $(if ($env:FUELFLASH_DEPLOY_SERVER) { $env:FUELFLASH_DEPLOY_SERVER } else { "ubuntu@145.241.164.91" }),
  [string]$KeyPath = $(if ($env:FUELFLASH_DEPLOY_KEY) {
      $env:FUELFLASH_DEPLOY_KEY
    } else {
      Join-Path $PSScriptRoot "..\\.local\\ssh\\ssh-key-2026-03-11.key"
    }),
  [string]$RemoteDeployCommand = $(if ($env:FUELFLASH_DEPLOY_COMMAND) {
      $env:FUELFLASH_DEPLOY_COMMAND
    } else {
      "/home/ubuntu/deploy/deploy.sh"
    })
)

$ErrorActionPreference = "Stop"

$archivePath = Join-Path $PSScriptRoot "..\\dist.tar.gz"

if (!(Test-Path $KeyPath)) {
  throw "SSH key not found: $KeyPath"
}

Push-Location (Join-Path $PSScriptRoot "..")
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
