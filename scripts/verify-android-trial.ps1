param(
    [string]$ApkPath = 'artifacts/android/krow-trial.apk',
    [string]$OutputJsonPath = ('docs/android-apk-' + [DateTime]::UtcNow.ToString('yyyyMMdd') + '.json')
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$apk = Join-Path $projectRoot $ApkPath
$tools = Join-Path $projectRoot 'node_modules/.cache/android-toolchain/sdk/build-tools/36.0.0'
$jdk = Get-ChildItem (Join-Path $projectRoot 'node_modules/.cache/android-toolchain/jdk17') -Directory | Select-Object -First 1
$savedJava = $env:JAVA_HOME
try {
    $env:JAVA_HOME = $jdk.FullName
    $signature = & (Join-Path $tools 'apksigner.bat') verify --verbose --print-certs $apk 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed' }
    if (($signature -join "`n") -notmatch '5e8f16062ea3cd2c4a0d547876baa6f38cabf625') { throw 'Unexpected trial signing certificate' }
    $badging = & (Join-Path $tools 'aapt.exe') dump badging $apk 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'APK metadata extraction failed' }
    $metadata = $badging -join "`n"
    if ($metadata -notmatch "package: name='com.krownmobileapp'" -or $metadata -notmatch "sdkVersion:'24'" -or $metadata -match 'application-debuggable') { throw 'Unexpected trial package settings' }
    if ($metadata -notmatch "versionCode='([0-9]+)' versionName='([^']+)'") { throw 'APK version metadata is missing' }
    $versionCode = [int]$Matches[1]
    $versionName = $Matches[2]
    $manifest = & (Join-Path $tools 'aapt.exe') dump xmltree $apk AndroidManifest.xml 2>&1
    if ($LASTEXITCODE -ne 0 -or ($manifest -join "`n") -notmatch 'usesCleartextTraffic.*0x0(?:\s|$)') { throw 'APK must disable cleartext HTTP' }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::OpenRead($apk)
    try {
        $bundle = $archive.GetEntry('assets/index.android.bundle')
        if (!$bundle -or $bundle.Length -lt 10000) { throw 'Bundled JavaScript is missing' }
        $stream = $bundle.Open()
        try {
            $magic = New-Object byte[] 8
            if ($stream.Read($magic, 0, 8) -ne 8 -or [BitConverter]::ToString($magic) -ne 'C6-1F-BC-03-C1-03-19-1F') { throw 'Expected compiled Hermes bytecode' }
        } finally { $stream.Dispose() }
        # RN 0.84 packages the Hermes VM as libhermesvm.so.
        $abis = @($archive.Entries.FullName | Where-Object { $_ -match '^lib/([^/]+)/libhermes(?:vm)?\.so$' } | ForEach-Object { ($_ -split '/')[1] })
        if ('arm64-v8a' -notin $abis) { throw 'ARM64 Hermes library is missing' }
        foreach ($abi in $abis) {
            if (!$archive.GetEntry("lib/$abi/libreactnative.so")) { throw 'React Native library is missing for an APK architecture' }
        }
        $evidence = [ordered]@{
            checkedAt = [DateTime]::UtcNow.ToString('o')
            apk = $ApkPath
            sha256 = (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash
            bytes = (Get-Item -LiteralPath $apk).Length
            package = 'com.krownmobileapp'
            versionCode = $versionCode
            versionName = $versionName
            minimumAndroidApi = 24
            signing = 'Debug certificate for private testing'
            signingSha1 = '5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25'
            signatureVerified = $true
            debuggable = $false
            cleartextTraffic = $false
            bundledHermes = $true
            bundleBytes = $bundle.Length
            architectures = $abis
            physicalInstallationVerified = $false
            physicalGpsVerified = $false
        }
        $evidence | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $projectRoot $OutputJsonPath)
        $evidence | ConvertTo-Json -Depth 4
    } finally { $archive.Dispose() }
} finally { $env:JAVA_HOME = $savedJava }
