# Ejecutar solo con una cuenta de prueba autorizada. Un login exitoso sin MFA crea una sesión.
# En modo automatizado (sin credenciales en argumentos), lee CMC_PROBE_EMAIL y CMC_PROBE_PASSWORD de variables de entorno efímeras.
param(
    [string]$Origin = 'https://casa-musica-castillo-backend.onrender.com',
    [ValidateRange(1, 120)]
    [int]$TimeoutSeconds = 45,
    [switch]$WarmupHealth,
    [switch]$SkipWarmup,
    [switch]$NonInteractive
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http

function Get-ExceptionChain {
    param([Exception]$Exception)
    $list = [System.Collections.Generic.List[Exception]]::new()
    $cur = $Exception
    while ($null -ne $cur) {
        $list.Add($cur)
        $cur = $cur.InnerException
    }
    return $list
}

function Classify-TransportFailure {
    param([Exception]$Exception)
    $chain = Get-ExceptionChain -Exception $Exception
    foreach ($ex in $chain) {
        if ($ex -is [System.Threading.Tasks.TaskCanceledException] -or $ex -is [System.TimeoutException]) {
            return [ordered]@{
                category  = 'timeout'
                detail    = 'La solicitud excedió el tiempo de espera configurado (posible arranque en frío de Render o caída de red).'
                exception = $ex.GetType().Name
            }
        }
        if ($ex -is [System.Security.Authentication.AuthenticationException]) {
            return [ordered]@{
                category  = 'tls_error'
                detail    = 'Fallo en la negociación o validación del certificado TLS/SSL.'
                exception = $ex.GetType().Name
            }
        }
        if ($ex -is [System.Net.WebException]) {
            $status = $ex.Status.ToString()
            switch ($status) {
                'NameResolutionFailure' {
                    return [ordered]@{
                        category  = 'dns_error'
                        detail    = 'No se pudo resolver el nombre de dominio (DNS).'
                        exception = "WebException:$status"
                    }
                }
                'TrustFailure' {
                    return [ordered]@{
                        category  = 'tls_error'
                        detail    = 'El certificado TLS del servidor no es confiable.'
                        exception = "WebException:$status"
                    }
                }
                'SecureChannelFailure' {
                    return [ordered]@{
                        category  = 'tls_error'
                        detail    = 'No se pudo establecer el canal seguro TLS/SSL.'
                        exception = "WebException:$status"
                    }
                }
                'Timeout' {
                    return [ordered]@{
                        category  = 'timeout'
                        detail    = 'Tiempo de espera agotado en la capa de transporte.'
                        exception = "WebException:$status"
                    }
                }
                'ConnectFailure' {
                    return [ordered]@{
                        category  = 'tcp_error'
                        detail    = 'No se pudo establecer la conexión TCP con el servidor.'
                        exception = "WebException:$status"
                    }
                }
                default {
                    return [ordered]@{
                        category  = 'transport_error'
                        detail    = "Fallo de transporte WebException ($status)."
                        exception = "WebException:$status"
                    }
                }
            }
        }
        if ($ex -is [System.Net.Sockets.SocketException]) {
            $err = $ex.SocketErrorCode.ToString()
            if ($err -match 'HostNotFound|TryAgain|NoData') {
                return [ordered]@{
                    category  = 'dns_error'
                    detail    = "Fallo de resolución DNS ($err)."
                    exception = "SocketException:$err"
                }
            }
            if ($err -eq 'TimedOut') {
                return [ordered]@{
                    category  = 'timeout'
                    detail    = 'Tiempo de conexión TCP agotado.'
                    exception = "SocketException:$err"
                }
            }
            return [ordered]@{
                category  = 'tcp_error'
                detail    = "Fallo de socket TCP ($err)."
                exception = "SocketException:$err"
            }
        }
    }
    $leaf = $chain[$chain.Count - 1]
    return [ordered]@{
        category  = 'transport_error'
        detail    = 'Error de transporte al enviar la solicitud HTTPS.'
        exception = $leaf.GetType().Name
    }
}

$normalizedOrigin = $Origin.Trim().TrimEnd('/')
if ($normalizedOrigin -notmatch '^https?://[A-Za-z0-9.-]+(?::\d+)?$') {
    throw 'El parámetro Origin debe ser un origen válido (esquema, host y puerto opcional).'
}
if ($normalizedOrigin -notmatch '^https://' -and $normalizedOrigin -notmatch '^http://(127\.0\.0\.1|localhost)(:\d+)?$') {
    throw 'Solo se permite HTTP sin cifrar contra localhost/127.0.0.1 para pruebas controladas.'
}

$email = $null
$plainPassword = $null
$secret = $null

try {
    if ($NonInteractive) {
        $email = [Environment]::GetEnvironmentVariable('CMC_PROBE_EMAIL')
        $plainPassword = [Environment]::GetEnvironmentVariable('CMC_PROBE_PASSWORD')
        [Environment]::SetEnvironmentVariable('CMC_PROBE_EMAIL', $null)
        [Environment]::SetEnvironmentVariable('CMC_PROBE_PASSWORD', $null)
        if ([string]::IsNullOrWhiteSpace($email) -or [string]::IsNullOrEmpty($plainPassword)) {
            throw 'Modo NonInteractive requiere variables efímeras CMC_PROBE_EMAIL y CMC_PROBE_PASSWORD.'
        }
    } else {
        $email = Read-Host 'Correo de la cuenta de prueba autorizada'
        $secret = Read-Host 'Contraseña' -AsSecureString
        $plainPassword = [Net.NetworkCredential]::new('', $secret).Password
    }

    $handler = [Net.Http.HttpClientHandler]::new()
    $handler.AllowAutoRedirect = $false
    $handler.UseCookies = $false
    $client = [Net.Http.HttpClient]::new($handler)
    $client.Timeout = [TimeSpan]::FromSeconds($TimeoutSeconds)
    $client.DefaultRequestHeaders.Add('Origin', 'https://localhost')
    $client.DefaultRequestHeaders.Add('Accept', 'application/json')

    try {
        $warmupStatus = $null
        $unauthenticatedMeStatus = $null
        if (-not $SkipWarmup -or $WarmupHealth) {
            try {
                $healthResp = $client.GetAsync("$normalizedOrigin/api/health").GetAwaiter().GetResult()
                $warmupStatus = [int]$healthResp.StatusCode
                $healthResp.Dispose()
            } catch {
                $warmupStatus = -1
            }
            if ($warmupStatus -gt 0) {
                try {
                    $meResp = $client.GetAsync("$normalizedOrigin/api/auth/me").GetAwaiter().GetResult()
                    $unauthenticatedMeStatus = [int]$meResp.StatusCode
                    $meResp.Dispose()
                } catch {
                    $unauthenticatedMeStatus = -1
                }
            }
        }

        $payload = @{
            email    = $email.Trim()
            password = $plainPassword
        } | ConvertTo-Json -Compress
        $plainPassword = $null

        $request = [Net.Http.StringContent]::new($payload, [Text.Encoding]::UTF8, 'application/json')
        $payload = $null
        $start = [DateTimeOffset]::UtcNow
        $response = $null

        try {
            $response = $client.PostAsync("$normalizedOrigin/api/auth/login", $request).GetAwaiter().GetResult()
            $status = [int]$response.StatusCode
            $result = [ordered]@{
                startedAtUtc            = $start.ToString('o')
                elapsedMs               = [int]([DateTimeOffset]::UtcNow - $start).TotalMilliseconds
                transportOk             = $true
                status                  = $status
                category                = 'unknown'
                diagnosis               = ''
                renderRequestId         = $null
                cfRay                   = $null
                contentType             = $null
                retryAfterHeader        = $null
                redirectLocationScheme  = $null
                json                    = $false
                success                 = $null
                twoFactorRequired       = $false
                preAuthChallengePresent = $false
                legacyUserPresent       = $false
                availableMethods        = @()
                jwtPresent              = $false
                jwtHasExp               = $false
                remainingTimeSeconds    = $null
            }
            if ($null -ne $warmupStatus) {
                $result['warmupHealthStatus'] = $warmupStatus
            }
            if ($null -ne $unauthenticatedMeStatus) {
                $result['unauthenticatedMeStatus'] = $unauthenticatedMeStatus
            }
            if ($response.Headers.Contains('rndr-id')) {
                $result['renderRequestId'] = ($response.Headers.GetValues('rndr-id') | Select-Object -First 1)
            }
            if ($response.Headers.Contains('CF-RAY')) {
                $result['cfRay'] = ($response.Headers.GetValues('CF-RAY') | Select-Object -First 1)
            }
            if ($response.Headers.Contains('Retry-After')) {
                $result['retryAfterHeader'] = ($response.Headers.GetValues('Retry-After') | Select-Object -First 1)
            }
            if ($null -ne $response.Content -and $null -ne $response.Content.Headers.ContentType) {
                $result['contentType'] = $response.Content.Headers.ContentType.MediaType
            }
            if ($status -ge 300 -and $status -lt 400) {
                $loc = $response.Headers.Location
                if ($null -ne $loc) {
                    $result['redirectLocationScheme'] = if ($loc.IsAbsoluteUri) { $loc.Scheme } else { 'relative' }
                }
                $result['category'] = 'redirect'
                $result['diagnosis'] = "El servidor devolvió una redirección HTTP $status inesperada."
                return ($result | ConvertTo-Json -Depth 4)
            }

            $rawText = ''
            if ($null -ne $response.Content) {
                $rawText = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
            }

            if (-not [string]::IsNullOrWhiteSpace($rawText)) {
                try {
                    $body = $rawText | ConvertFrom-Json
                    $rawText = $null
                    $result['json'] = $true
                    if ($body.PSObject.Properties['success'] -and $body.success -is [bool]) {
                        $result['success'] = $body.success
                    }
                    if ($body.PSObject.Properties['remainingTimeSeconds'] -and $null -ne $body.remainingTimeSeconds) {
                        $result['remainingTimeSeconds'] = [int]$body.remainingTimeSeconds
                    }
                    if ($body.PSObject.Properties['data'] -and $null -ne $body.data) {
                        $data = $body.data
                        if ($data.PSObject.Properties['twoFactorRequired']) {
                            $result['twoFactorRequired'] = ($data.twoFactorRequired -eq $true)
                        }
                        if ($data.PSObject.Properties['preAuthChallenge'] -and $data.preAuthChallenge -is [string]) {
                            $result['preAuthChallengePresent'] = ($data.preAuthChallenge -match '^[A-Za-z0-9_-]{43}$')
                        }
                        if ($data.PSObject.Properties['user'] -and $null -ne $data.user) {
                            $result['legacyUserPresent'] = $true
                        }
                        if ($data.PSObject.Properties['availableMethods'] -and $null -ne $data.availableMethods) {
                            $activeMethods = @()
                            foreach ($m in @('EMAIL', 'GOOGLE_AUTHENTICATOR', 'BACKUP_CODE')) {
                                if ($data.availableMethods.PSObject.Properties[$m] -and $data.availableMethods.$m -eq $true) {
                                    $activeMethods += $m
                                }
                            }
                            $result['availableMethods'] = $activeMethods
                        }
                        if ($data.PSObject.Properties['jwtResponse'] -and $null -ne $data.jwtResponse) {
                            $jwt = $data.jwtResponse.accessToken
                            if ($jwt -is [string] -and $jwt.Split('.').Count -eq 3) {
                                $result['jwtPresent'] = $true
                                try {
                                    $payloadPart = $jwt.Split('.')[1].Replace('-', '+').Replace('_', '/')
                                    switch ($payloadPart.Length % 4) {
                                        2 { $payloadPart += '==' }
                                        3 { $payloadPart += '=' }
                                    }
                                    $jwtClaims = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payloadPart)) | ConvertFrom-Json
                                    $result['jwtHasExp'] = ($null -ne $jwtClaims.exp)
                                } catch { }
                            }
                        }
                    }
                } catch { }
            }

            # Clasificación semántica sin exponer datos sensibles
            if ($status -eq 200) {
                if (-not $result['json'] -or $result['success'] -ne $true) {
                    $result['category'] = 'incompatible_contract'
                    $result['diagnosis'] = 'HTTP 200 pero el cuerpo no es un ApiResponse válido con success=true.'
                } elseif ($result['twoFactorRequired']) {
                    if ($result['preAuthChallengePresent'] -and $result['availableMethods'].Count -gt 0) {
                        $result['category'] = 'mfa_challenge_valid'
                        $result['diagnosis'] = 'Desafío MFA moderno válido (preAuthChallenge presente).'
                    } elseif (-not $result['preAuthChallengePresent'] -and $result['legacyUserPresent']) {
                        $result['category'] = 'incompatible_mfa_legacy'
                        $result['diagnosis'] = 'El servidor emitió el contrato MFA antiguo (twoFactorRequired + user sin preAuthChallenge). El APK comercial lo rechaza por seguridad.'
                    } else {
                        $result['category'] = 'incompatible_contract'
                        $result['diagnosis'] = 'Desafío MFA incompleto o malformado.'
                    }
                } elseif ($result['jwtPresent'] -and $result['jwtHasExp']) {
                    $result['category'] = 'authenticated_session'
                    $result['diagnosis'] = 'Inicio de sesión directo exitoso (JWT emitido con exp válido).'
                } else {
                    $result['category'] = 'incompatible_contract'
                    $result['diagnosis'] = 'HTTP 200 sin desafío MFA ni JWT válido.'
                }
            } elseif ($status -eq 400) {
                $result['category'] = 'validation_error'
                $result['diagnosis'] = 'Solicitud rechazada con HTTP 400 (formato o validación).'
            } elseif ($status -eq 401) {
                $result['category'] = 'invalid_credentials'
                $result['diagnosis'] = 'Credenciales inválidas o cuenta no autorizada (HTTP 401).'
            } elseif ($status -eq 403) {
                $result['category'] = 'account_unverified_or_forbidden'
                $result['diagnosis'] = 'Acceso denegado o cuenta pendiente de verificación (HTTP 403).'
            } elseif ($status -eq 429) {
                $result['category'] = 'rate_limited'
                $result['diagnosis'] = 'Límite de intentos o bloqueo temporal alcanzado (HTTP 429).'
            } elseif ($status -ge 500) {
                $result['category'] = 'backend_error'
                $result['diagnosis'] = "Fallo interno del servidor o puerta de enlace (HTTP $status)."
            } else {
                $result['category'] = "http_$status"
                $result['diagnosis'] = "Respuesta HTTP inesperada ($status)."
            }

            $result | ConvertTo-Json -Depth 4
        } catch {
            $classification = Classify-TransportFailure -Exception $_.Exception
            $errResult = [ordered]@{
                startedAtUtc = $start.ToString('o')
                elapsedMs    = [int]([DateTimeOffset]::UtcNow - $start).TotalMilliseconds
                transportOk  = $false
                status       = $null
                category     = $classification.category
                exception    = $classification.exception
                diagnosis    = $classification.detail
            }
            if ($null -ne $warmupStatus) {
                $errResult['warmupHealthStatus'] = $warmupStatus
            }
            if ($null -ne $unauthenticatedMeStatus) {
                $errResult['unauthenticatedMeStatus'] = $unauthenticatedMeStatus
            }
            $errResult | ConvertTo-Json -Depth 4
            exit 1
        } finally {
            if ($null -ne $response) { $response.Dispose() }
            if ($null -ne $request) { $request.Dispose() }
        }
    } finally {
        $client.Dispose()
        $handler.Dispose()
    }
} finally {
    $plainPassword = $null
    if ($null -ne $secret -and $secret -is [System.IDisposable]) {
        $secret.Dispose()
    }
}
