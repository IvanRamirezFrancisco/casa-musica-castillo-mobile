param(
    [string] $KeystorePath = 'C:\Users\ivanf\CMC-Keys\castillo-upload.p12',
    [string] $KeyAlias = 'castillo-upload',
    [string] $CertificateSha256 = '47:49:2A:A3:5B:3F:B2:61:73:BA:F1:EF:23:6C:3C:2B:EF:C3:3D:B8:E3:ED:C3:D5:2E:F0:C7:75:35:33:DB:C3',
    [switch] $EnableReviewedCommerce,
    [switch] $DisableReviewedCommerce
)

$ErrorActionPreference = 'Stop'
$expectedFingerprint = $CertificateSha256.Replace(':', '').ToLowerInvariant()
if ($expectedFingerprint -notmatch '^[0-9a-f]{64}$') {
    throw 'Proporciona los 64 dígitos hexadecimales de la huella pública SHA-256.'
}
$store = Get-Item -LiteralPath $KeystorePath
if ($store.PSIsContainer -or $store.Extension -notmatch '^\.(p12|pfx|pkcs12)$') {
    throw 'Selecciona el archivo PKCS12 bajo tu custodia.'
}
$uploadVariables = @('CMC_UPLOAD_STORE_FILE', 'CMC_UPLOAD_KEY_ALIAS', 'CMC_UPLOAD_STORE_PASSWORD', 'CMC_UPLOAD_KEY_PASSWORD')
foreach ($name in $uploadVariables) {
    if (Test-Path "Env:$name") { throw 'Abre una terminal sin variables CMC_UPLOAD_* preconfiguradas.' }
}

Push-Location (Join-Path $PSScriptRoot '..')
try {
    $secret = Read-Host 'Contraseña del almacén y de la clave PKCS12' -AsSecureString
    try {
        $env:CMC_UPLOAD_STORE_FILE = $store.FullName
        $env:CMC_UPLOAD_KEY_ALIAS = $KeyAlias
        $env:CMC_UPLOAD_STORE_PASSWORD = [Net.NetworkCredential]::new('', $secret).Password
        $env:CMC_UPLOAD_KEY_PASSWORD = $env:CMC_UPLOAD_STORE_PASSWORD
        $entry = & keytool '-J-Duser.language=en' '-J-Duser.country=US' -list -v -storetype PKCS12 `
            -keystore $store.FullName -alias $KeyAlias '-storepass:env' CMC_UPLOAD_STORE_PASSWORD 2>$null
        if ($LASTEXITCODE -ne 0) { throw 'El PKCS12 no se pudo abrir con el alias y la contraseña proporcionados.' }
        $entryText = $entry -join "`n"
        $fingerprint = [regex]::Match($entryText, '(?m)^\s*SHA256:\s*([0-9A-Fa-f:]+)\s*$')
        if ($entryText -notmatch '(?m)^Entry type: PrivateKeyEntry\s*$' -or -not $fingerprint.Success -or
            $fingerprint.Groups[1].Value.Replace(':', '').ToLowerInvariant() -ne $expectedFingerprint) {
            throw 'El alias no contiene la clave privada correspondiente a la huella autorizada.'
        }

        $useReviewedCommerce = if ($DisableReviewedCommerce) { $false } elseif ($EnableReviewedCommerce) { $true } else { $true }
        $buildArguments = @('--environment', 'production', '--variant', 'release', '--require-signing')
        if ($useReviewedCommerce) { $buildArguments += '--enable-reviewed-commerce' }
        & node scripts/build-android.mjs @buildArguments
        if ($LASTEXITCODE -ne 0) { throw 'Falló la generación de los paquetes Release firmados.' }
    } finally {
        foreach ($name in $uploadVariables) { Remove-Item "Env:$name" -ErrorAction SilentlyContinue }
        if ($null -ne $secret -and $secret -is [System.IDisposable]) { $secret.Dispose() }
    }
    $verifyArguments = @('--certificate-sha256', $expectedFingerprint)
    if ($useReviewedCommerce) { $verifyArguments += '--reviewed-commerce' }
    & python scripts/verify-android-release.py @verifyArguments
    if ($LASTEXITCODE -ne 0) { throw 'Falló la verificación de ambos paquetes. Revisa la salida antes de utilizar los archivos.' }
} finally {
    Pop-Location
}
