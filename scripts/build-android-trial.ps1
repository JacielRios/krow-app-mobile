param(
    [string]$EnvironmentFile = '.env.trial',
    [ValidateSet('arm64-v8a', 'arm64-v8a,armeabi-v7a', 'arm64-v8a,x86_64')]
    [string]$Architectures = 'arm64-v8a,armeabi-v7a'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolRoot = Join-Path $projectRoot 'node_modules/.cache/android-toolchain'
$envPath = Join-Path $projectRoot $EnvironmentFile
if (!(Test-Path -LiteralPath $envPath -PathType Leaf)) {
    throw 'Create an ignored mobile environment file with the public Supabase configuration and deployed HTTPS API URL first.'
}

# react-native-config embeds every field; reject files containing server secrets.
$publicFields = @(
    'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'KROW_API_URL', 'KROW_PILOT_ENABLED',
    'KROW_TRACKING_ENABLED', 'KROW_PILOT_PUSH_ENABLED', 'KROW_ACCOUNT_CLOSURE_ENABLED',
    'KROW_SUPPORT_URL', 'KROW_PRIVACY_URL', 'KROW_AUTH_REDIRECT_URL',
    'KROW_IOS_MAPS_API_KEY', 'KROW_RUNTIME_ENABLED', 'KROW_MAPBOX_PUBLIC_TOKEN', 'KROW_LINK_ORIGIN'
)
foreach ($line in Get-Content -LiteralPath $envPath) {
    if ($line -match '^\s*(?:export\s+)?([\w.\-]+)\s*=\s*(.*)$') {
        $field = $Matches[1]
        if ($field -notin $publicFields) {
            throw "Unexpected mobile environment field: $field. Server credentials must never enter the APK."
        }
        $value = $Matches[2].Trim().Trim('"', "'")
        if ($value -match '^sb_secret_' -or $value -match '-----BEGIN .*PRIVATE KEY-----' -or
            ($field -eq 'KROW_MAPBOX_PUBLIC_TOKEN' -and $value -and $value -notmatch '^pk\.')) {
            throw 'A secret credential was found in the mobile environment. Build stopped.'
        }
        if ($field -eq 'SUPABASE_ANON_KEY' -and $value -match '^eyJ[^.]+\.([^.]+)\.') {
            $payload = $Matches[1].Replace('-', '+').Replace('_', '/')
            $payload = $payload.PadRight($payload.Length + ((4 - $payload.Length % 4) % 4), '=')
            $role = ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload)) | ConvertFrom-Json).role
            if ($role -ne 'anon') { throw 'Only an anon/publishable Supabase key can be embedded in an APK.' }
        }
    }
}

$savedEnvironment = @{}
foreach ($name in 'JAVA_HOME', 'ANDROID_HOME', 'ANDROID_SDK_ROOT', 'ENVFILE', 'GRADLE_USER_HOME', 'PATH') {
    $savedEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}
try {
    $portableJdk = Get-ChildItem (Join-Path $toolRoot 'jdk17') -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($portableJdk) { $env:JAVA_HOME = $portableJdk.FullName }
    if (Test-Path (Join-Path $toolRoot 'sdk')) { $env:ANDROID_HOME = Join-Path $toolRoot 'sdk' }
    if (!$env:JAVA_HOME -or !(Test-Path (Join-Path $env:JAVA_HOME 'bin/java.exe'))) { throw 'Java 17 is required by the React Native toolchain.' }
    if (!$env:ANDROID_HOME -or !(Test-Path (Join-Path $env:ANDROID_HOME 'platforms/android-36/android.jar'))) { throw 'Android SDK 36 is required.' }
    $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
    # Keep native Prefab paths below Ninja's Windows 260-character limit.
    $env:GRADLE_USER_HOME = Join-Path $projectRoot '.g'
    $env:ENVFILE = $envPath
    $env:PATH = "$env:JAVA_HOME/bin;$env:ANDROID_HOME/platform-tools;$env:PATH"
    Push-Location (Join-Path $projectRoot 'android')
    try {
        & .\gradlew.bat :app:assembleTrial "-PreactNativeArchitectures=$Architectures" --no-daemon --console=plain
        if ($LASTEXITCODE -ne 0) { throw "Android build failed with exit code $LASTEXITCODE." }
    } finally { Pop-Location }
    $apk = Join-Path $projectRoot 'android/app/build/outputs/apk/trial/app-trial.apk'
    $destinationDirectory = Join-Path $projectRoot 'artifacts/android'
    New-Item -ItemType Directory -Force -Path $destinationDirectory | Out-Null
    $destination = Join-Path $destinationDirectory 'krow-trial.apk'
    Copy-Item -LiteralPath $apk -Destination $destination -Force
    Get-FileHash -LiteralPath $destination -Algorithm SHA256 | Select-Object Path, Hash
    Write-Output 'Private test APK created with bundled JavaScript and debug signing. Production release signing remains required.'
} finally {
    foreach ($entry in $savedEnvironment.GetEnumerator()) {
        [Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, 'Process')
    }
}
