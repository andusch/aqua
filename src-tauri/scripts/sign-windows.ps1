# Signs a Windows binary when TAURI_WINDOWS_CERTIFICATE_THUMBPRINT is set.
# Skips signing silently when the thumbprint is not configured (local dev builds).
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$BinaryPath
)

$thumbprint = $env:TAURI_WINDOWS_CERTIFICATE_THUMBPRINT
if ([string]::IsNullOrWhiteSpace($thumbprint)) {
    Write-Host "sign-windows: TAURI_WINDOWS_CERTIFICATE_THUMBPRINT not set, skipping code signing."
    exit 0
}

$signtool = @(
    "${env:ProgramFiles(x86)}\Windows Kits\10\bin\*\x64\signtool.exe",
    "${env:ProgramFiles}\Windows Kits\10\bin\*\x64\signtool.exe"
) | ForEach-Object { Get-Item $_ -ErrorAction SilentlyContinue } | Sort-Object FullName -Descending | Select-Object -First 1

if (-not $signtool) {
    Write-Error "signtool.exe not found. Install the Windows SDK (Signing Tools for Windows)."
    exit 1
}

$timestampUrl = if ($env:TAURI_WINDOWS_TIMESTAMP_URL) { $env:TAURI_WINDOWS_TIMESTAMP_URL } else { "http://timestamp.digicert.com" }

& $signtool.FullName sign `
    /fd sha256 `
    /tr $timestampUrl `
    /td sha256 `
    /sha1 $thumbprint `
    /a `
    $BinaryPath

if ($LASTEXITCODE -ne 0) {
    Write-Error "Code signing failed for $BinaryPath"
    exit $LASTEXITCODE
}

Write-Host "Successfully signed: $BinaryPath"
