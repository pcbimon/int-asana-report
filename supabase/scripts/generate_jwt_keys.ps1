# Generates HS256 JWT tokens for ANON_KEY and SERVICE_ROLE_KEY and updates .env
# Usage: pwsh -File .\scripts\generate_jwt_keys.ps1

$envFile = "d:\Projects\int-asana-report\supabase\.env"
if (-not (Test-Path $envFile)) {
  Write-Error ".env not found at $envFile"
  exit 1
}
# Read as array of lines
$lines = Get-Content $envFile -ErrorAction Stop -Encoding UTF8
$jwtLine = $lines | Where-Object { $_ -match '^JWT_SECRET=' }
if (-not $jwtLine) { Write-Error 'JWT_SECRET not found in .env'; exit 1 }
$secret = $jwtLine -replace '^JWT_SECRET='

function b64url([byte[]]$b){
  $s = [Convert]::ToBase64String($b)
  $s = $s.TrimEnd('=')
  $s = $s -replace '\+','-' -replace '/','_'
  return $s
}
function encodeStr([string]$s){
  $b = [System.Text.Encoding]::UTF8.GetBytes($s)
  return b64url $b
}

$hdr = encodeStr('{"alg":"HS256","typ":"JWT"}')
$now = [int][Math]::Floor((Get-Date).ToUniversalTime().Subtract([datetime]'1970-01-01').TotalSeconds)
$exp = $now + 315360000 # long-lived (~10 years)

# Build payloads using hashtables + ConvertTo-Json to avoid quoting issues
$payload1 = @{ role = 'anon'; iss = 'supabase'; iat = $now; exp = $exp } | ConvertTo-Json -Compress
$pl1 = encodeStr($payload1)
$to1 = "$hdr.$pl1"

$hmac = [System.Security.Cryptography.HMACSHA256]::new([System.Text.Encoding]::UTF8.GetBytes($secret))
$sig1 = b64url ($hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($to1)))
$anonToken = "$hdr.$pl1.$sig1"

$payload2 = @{ role = 'service_role'; iss = 'supabase'; iat = $now; exp = $exp } | ConvertTo-Json -Compress
$pl2 = encodeStr($payload2)
$to2 = "$hdr.$pl2"
# compute second signature using same HMAC instance
$sig2 = b64url ($hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($to2)))
$serviceToken = "$hdr.$pl2.$sig2"

# Replace lines in .env
$new = $lines | ForEach-Object {
  if ($_ -match '^ANON_KEY=') { "ANON_KEY=$anonToken" }
  elseif ($_ -match '^SERVICE_ROLE_KEY=') { "SERVICE_ROLE_KEY=$serviceToken" }
  else { $_ }
}

Set-Content -Path $envFile -Value $new -Encoding UTF8

Write-Output "UPDATED .env with new ANON_KEY and SERVICE_ROLE_KEY"
Write-Output "ANON_KEY=$anonToken"
Write-Output "SERVICE_ROLE_KEY=$serviceToken"
