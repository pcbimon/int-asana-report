<#
Generates secure secrets for keys listed in .env.example and produces a .env file.
Usage:
  pwsh -File .\scripts\generate_all_secrets.ps1           # preview output (does not overwrite .env)
  pwsh -File .\scripts\generate_all_secrets.ps1 -Force   # writes .env (overwrites)

The script maps common variable names to secure generators. If a key already exists in .env, it will keep that value unless -Force is passed.
#>
param(
  [switch]$Force
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$example = Join-Path $root '..\.env.example' | Resolve-Path -ErrorAction Stop
$examplePath = $example.Path
$envExampleLines = Get-Content $examplePath -Encoding UTF8

function New-Base64([int]$bytes=32){ $b=New-Object byte[] $bytes; [System.Security.Cryptography.RandomNumberGenerator]::Fill($b); [Convert]::ToBase64String($b) }
function New-Hex([int]$bytes=32){ $b=New-Object byte[] $bytes; [System.Security.Cryptography.RandomNumberGenerator]::Fill($b); ($b | ForEach-Object{ $_.ToString('x2') }) -join '' }
function New-Password([int]$length=24){ $chars = ('abcdefghijklmnopqrstuvwxyz'+'ABCDEFGHIJKLMNOPQRSTUVWXYZ'+'0123456789'+'!@#$%^&*()-_=+[]{}:;,.<>?') -split ''; -join (1..$length | ForEach-Object { $chars | Get-Random }) }

# map var -> generator function and args
$generators = @{
  'POSTGRES_PASSWORD' = { New-Password 24 }
  'JWT_SECRET' = { New-Base64 32 }
  # ANON_KEY and SERVICE_ROLE_KEY will be created as HS256 JWTs signed with JWT_SECRET
  'ANON_KEY' = { 'GENERATE_JWT_ANON' }
  'SERVICE_ROLE_KEY' = { 'GENERATE_JWT_SERVICE' }
  'DASHBOARD_PASSWORD' = { New-Password 20 }
  'SECRET_KEY_BASE' = { New-Hex 32 }
  'VAULT_ENC_KEY' = { New-Base64 32 }
  'LOGFLARE_PRIVATE_ACCESS_TOKEN' = { New-Base64 32 }
  'LOGFLARE_PUBLIC_ACCESS_TOKEN' = { New-Base64 32 }
  'SMTP_PASS' = { New-Password 20 }
  'DOCKER_SOCKET_LOCATION' = { '/var/run/docker.sock' }
}

# read existing .env if present
$envPath = Join-Path $root '..\.env' | Resolve-Path -ErrorAction SilentlyContinue
$existing = @{}
if ($envPath) {
  $envLines = Get-Content $envPath.Path -Encoding UTF8
  foreach ($l in $envLines) {
    if ($l -match '^(\w+)=(.*)$') { $existing[$matches[1]] = $matches[2] }
  }
}

$out = @()
foreach ($line in $envExampleLines) {
  if ($line -match '^\s*#') { $out += $line; continue }
  if ($line -match '^\s*$') { $out += $line; continue }
  if ($line -match '^(\w+)=(.*)$') {
    $key = $matches[1]
    $val = $matches[2]
    if ($existing.ContainsKey($key) -and -not $Force) {
      $out += "$key=$($existing[$key])"
      continue
    }
    if ($generators.ContainsKey($key)) {
      $gen = & $generators[$key]
      if ($gen -eq 'GENERATE_JWT_ANON' -or $gen -eq 'GENERATE_JWT_SERVICE') {
        # ensure JWT_SECRET exists (generate if not)
        if (-not $existing.ContainsKey('JWT_SECRET')) {
          $existing['JWT_SECRET'] = (& $generators['JWT_SECRET'])
        }
        $jwtSecret = $existing['JWT_SECRET']
        function b64url([byte[]]$b){ $s=[Convert]::ToBase64String($b); $s=$s.TrimEnd('='); $s=$s -replace '\+','-' -replace '/','_'; return $s }
        function encodeStr([string]$s){ $b=[System.Text.Encoding]::UTF8.GetBytes($s); return b64url $b }
        $hdr = encodeStr('{"alg":"HS256","typ":"JWT"}')
        $now = [int][Math]::Floor((Get-Date).ToUniversalTime().Subtract([datetime]'1970-01-01').TotalSeconds)
        $exp = $now + 315360000
        if ($gen -eq 'GENERATE_JWT_ANON') {
          $payload = @{ role = 'anon'; iss = 'supabase'; iat = $now; exp = $exp } | ConvertTo-Json -Compress
        } else {
          $payload = @{ role = 'service_role'; iss = 'supabase'; iat = $now; exp = $exp } | ConvertTo-Json -Compress
        }
        $pl = encodeStr($payload)
        $toSign = "$hdr.$pl"
        $hmac = [System.Security.Cryptography.HMACSHA256]::new([System.Text.Encoding]::UTF8.GetBytes($jwtSecret))
        $sig = b64url ($hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($toSign)))
        $token = "$hdr.$pl.$sig"
        $out += "$key=$token"
      } else {
        $out += "$key=$gen"
      }
    } else {
      # heuristic: if name contains SECRET, KEY, TOKEN, PASS, KEY_BASE, use base64 or hex
      if ($key -match 'SECRET|KEY_BASE') { $out += "$key=$(New-Hex 32)" }
      elseif ($key -match 'SECRET|KEY|TOKEN|PASS|PASSWORD') { $out += "$key=$(New-Base64 32)" }
      else { $out += "$key=$val" }
    }
  } else {
    $out += $line
  }
}

# Preview to console
Write-Output "# Generated .env preview (run with -Force to overwrite .env)"
$out | ForEach-Object { Write-Output $_ }

if ($Force) {
  $target = Join-Path $root '..\.env'
  $out | Set-Content -Path $target -Encoding UTF8
  Write-Output "WROTE $target"
}
