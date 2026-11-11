# Ejecutar solo con una cuenta de prueba autorizada. Un login exitoso crea una sesión.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
$origin = 'https://casa-musica-castillo-backend.onrender.com'
$email = Read-Host 'Correo de la cuenta de prueba autorizada'
$secret = Read-Host 'Contraseña' -AsSecureString
$handler = [Net.Http.HttpClientHandler]::new()
$handler.AllowAutoRedirect = $false
$handler.UseCookies = $false
$client = [Net.Http.HttpClient]::new($handler)
$client.Timeout = [TimeSpan]::FromSeconds(20)
$client.DefaultRequestHeaders.Add('Origin', 'https://localhost')
try {
    $payload = @{
        email = $email.Trim()
        password = [Net.NetworkCredential]::new('', $secret).Password
    } | ConvertTo-Json -Compress
    $request = [Net.Http.StringContent]::new($payload, [Text.Encoding]::UTF8, 'application/json')
    $start = [DateTimeOffset]::UtcNow
    try {
        $response = $client.PostAsync("$origin/api/auth/login", $request).GetAwaiter().GetResult()
        $result = [ordered]@{
            startedAtUtc = $start.ToString('o')
            elapsedMs = [int]([DateTimeOffset]::UtcNow - $start).TotalMilliseconds
            status = [int]$response.StatusCode
            json = $false
            success = $null
            twoFactorRequired = $false
            preAuthChallengePresent = $false
            legacyUserPresent = $false
            jwtPresent = $false
        }
        if ($response.Headers.Contains('rndr-id')) {
            $result['renderRequestId'] = ($response.Headers.GetValues('rndr-id') | Select-Object -First 1)
        }
        try {
            $body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json
            $result['json'] = $true
            if ($body.success -is [bool]) { $result['success'] = $body.success }
            $result['twoFactorRequired'] = $body.data.twoFactorRequired -eq $true
            $result['preAuthChallengePresent'] = $body.data.preAuthChallenge -is [string] -and
                $body.data.preAuthChallenge -match '^[A-Za-z0-9_-]{43}$'
            $result['legacyUserPresent'] = $null -ne $body.data.user
            $result['jwtPresent'] = $body.data.jwtResponse.accessToken -is [string]
        } catch { }
        $result | ConvertTo-Json
    } finally {
        if ($null -ne $response) { $response.Dispose() }
        $request.Dispose()
    }
} catch {
    throw 'No se pudo obtener una respuesta HTTPS de Render.'
} finally {
    $client.Dispose()
    $secret.Dispose()
}
