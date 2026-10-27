param(
    [string]$SourceImage = "$PSScriptRoot\..\public\icon.png"
)

Add-Type -AssemblyName System.Drawing

$destDir = "$PSScriptRoot\..\public"
$destIconDir = Join-Path $destDir "icon"

if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
if (-not (Test-Path $destIconDir)) { New-Item -ItemType Directory -Force -Path $destIconDir | Out-Null }

if (-not (Test-Path $SourceImage)) {
    Write-Error "Source image not found at $SourceImage"
    exit 1
}

$img = [System.Drawing.Image]::FromFile($SourceImage)

$sizes = @(16, 32, 48, 128)
foreach ($size in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($img, 0, 0, $size, $size)
    $g.Dispose()

    $p1 = Join-Path $destDir ("icon-" + $size + ".png")
    $p2 = Join-Path $destIconDir ($size.ToString() + ".png")
    $bmp.Save($p1, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Save($p2, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created ${size}x${size} icon"
}

$img.Dispose()
Write-Host "All icons created successfully!"
