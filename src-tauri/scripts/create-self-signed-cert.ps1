# Creates a self-signed code-signing certificate for local Windows builds.
# Run on Windows in PowerShell (as Administrator recommended for TrustedPublisher).
param(
    [string]$Subject = "CN=Aqua Dev, O=Aqua, C=RO",
    [string]$PfxPath = "certificate/aqua-dev.pfx",
    [string]$PfxPassword = "aqua-dev-signing"
)

$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path (Split-Path $PfxPath) | Out-Null

$cert = New-SelfSignedCertificate `
    -Type CodeSigningCert `
    -Subject $Subject `
    -KeyUsage DigitalSignature `
    -FriendlyName "Aqua Dev Code Signing" `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}")

$securePassword = ConvertTo-SecureString -String $PfxPassword -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $PfxPath -Password $securePassword | Out-Null

Write-Host ""
Write-Host "Self-signed certificate created."
Write-Host "  PFX file:     $PfxPath"
Write-Host "  Thumbprint:   $($cert.Thumbprint)"
Write-Host ""
Write-Host "Import before building:"
Write-Host "  Import-PfxCertificate -FilePath '$PfxPath' -CertStoreLocation Cert:\CurrentUser\My -Password (ConvertTo-SecureString '$PfxPassword' -AsPlainText -Force)"
Write-Host ""
Write-Host "Set for Tauri builds:"
Write-Host "  `$env:TAURI_WINDOWS_CERTIFICATE_THUMBPRINT = '$($cert.Thumbprint)'"
Write-Host ""
Write-Host "Note: SmartScreen will still warn until users trust the publisher or you use an OV/EV certificate."
