#requires -version 5.1

$ErrorActionPreference = "Stop"

function Test-IsAdmin {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdmin)) {
  Write-Error "Run this script from an elevated PowerShell window: Run as administrator."
  exit 1
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $repoRoot ".runtime-logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$logPath = Join-Path $logDir ("enable-wsl-for-docker-{0}.log" -f (Get-Date -Format "yyyyMMdd-HHmmss"))

Start-Transcript -Path $logPath -Force | Out-Null

try {
  $rebootRequired = $false

  function Enable-WindowsFeatureForDocker {
    param(
      [Parameter(Mandatory = $true)]
      [string]$FeatureName
    )

    Write-Host "Enabling feature: $FeatureName"
    $dismOutput = & dism.exe /online /enable-feature /featurename:$FeatureName /all /norestart 2>&1
    $dismOutput | ForEach-Object { Write-Host $_ }
    $code = $LASTEXITCODE
    if ($code -eq 3010) {
      $rebootRequired = $true
      return $true
    } elseif ($code -ne 0) {
      Write-Warning "DISM failed for $FeatureName with exit code $code"
      return $false
    }

    return $true
  }

  Write-Host "Enabling Windows features required by Docker Desktop..."

  $wslFeatures = @(
    "Microsoft-Windows-Subsystem-Linux",
    "VirtualMachinePlatform"
  )

  $wslFeatureOk = $true
  foreach ($feature in $wslFeatures) {
    if (-not (Enable-WindowsFeatureForDocker -FeatureName $feature)) {
      $wslFeatureOk = $false
    }
  }

  if (-not $wslFeatureOk) {
    Write-Warning "WSL features were not fully available. Trying Docker Desktop Hyper-V fallback features..."
    $hyperVFeatures = @(
      "Microsoft-Hyper-V-All",
      "Containers"
    )
    foreach ($feature in $hyperVFeatures) {
      [void](Enable-WindowsFeatureForDocker -FeatureName $feature)
    }
  }

  $currentUser = "$env:COMPUTERNAME\$env:USERNAME"
  try {
    $members = Get-LocalGroupMember -Group "docker-users" -ErrorAction Stop | ForEach-Object { $_.Name }
    if ($members -notcontains $currentUser) {
      Write-Host "Adding $currentUser to docker-users..."
      Add-LocalGroupMember -Group "docker-users" -Member $currentUser
      $rebootRequired = $true
    } else {
      Write-Host "$currentUser is already in docker-users."
    }
  } catch {
    Write-Warning "Could not verify docker-users membership: $($_.Exception.Message)"
  }

  $wsl = Join-Path $env:WINDIR "System32\wsl.exe"
  if (Test-Path $wsl) {
    Write-Host "Configuring WSL 2..."
    & $wsl --set-default-version 2
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "wsl --set-default-version 2 returned exit code $LASTEXITCODE"
    }

    & $wsl --update
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "wsl --update returned exit code $LASTEXITCODE"
    }

    & $wsl --install --no-distribution
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "wsl --install --no-distribution returned exit code $LASTEXITCODE"
    }
  } else {
    Write-Warning "wsl.exe is not available yet. Reboot Windows after enabling features, then run wsl --update."
    $rebootRequired = $true
  }

  Write-Host ""
  if ($rebootRequired) {
    Write-Host "RESULT: REBOOT_REQUIRED"
    Write-Host "Restart Windows or sign out/sign in, then open Docker Desktop again."
  } else {
    Write-Host "RESULT: READY_TO_START_DOCKER"
    Write-Host "Open Docker Desktop and run: docker info"
  }
  Write-Host "Log: $logPath"
} finally {
  Stop-Transcript | Out-Null
}
