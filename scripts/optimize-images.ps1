param(
  [string]$SourceRoot = (Join-Path $PSScriptRoot '..\media-originals\public\ressources'),
  [string]$PublicRoot = (Join-Path $PSScriptRoot '..\public\ressources')
)

$ErrorActionPreference = 'Stop'
$ffmpeg = (Get-Command ffmpeg -ErrorAction Stop).Source

function Convert-ToWebp {
  param(
    [Parameter(Mandatory)][string]$InputPath,
    [Parameter(Mandatory)][string]$OutputPath,
    [int]$Width = 0,
    [int]$Quality = 88,
    [switch]$Lossless
  )

  $outputDirectory = Split-Path -Parent $OutputPath
  New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null

  $arguments = @('-hide_banner', '-loglevel', 'error', '-y', '-i', $InputPath)
  if ($Width -gt 0) {
    $arguments += @('-vf', "scale=$Width`:-1:flags=lanczos")
  }
  $arguments += @('-frames:v', '1', '-c:v', 'libwebp', '-compression_level', '6')
  if ($Lossless) {
    $arguments += @('-lossless', '1')
  } else {
    $arguments += @('-preset', 'photo', '-q:v', $Quality.ToString())
  }
  $arguments += $OutputPath

  & $ffmpeg @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "WebP conversion failed for $InputPath"
  }
}

$demonstrationSource = Join-Path $SourceRoot '02-demonstration'
$demonstrationOutput = Join-Path $PublicRoot '02-demonstration'
Get-ChildItem -LiteralPath $demonstrationSource -Filter '*.jpeg' | ForEach-Object {
  $name = $_.BaseName
  Convert-ToWebp $_.FullName (Join-Path $demonstrationOutput "$name-thumb-320.webp") -Width 320 -Quality 82
  Convert-ToWebp $_.FullName (Join-Path $demonstrationOutput "$name-thumb-480.webp") -Width 480 -Quality 82
  Convert-ToWebp $_.FullName (Join-Path $demonstrationOutput "$name-640.webp") -Width 640 -Quality 88
  Convert-ToWebp $_.FullName (Join-Path $demonstrationOutput "$name-960.webp") -Width 960 -Quality 88
  $largeWidth = if ($name -eq 'V3-03') { 1200 } else { 1280 }
  Convert-ToWebp $_.FullName (Join-Path $demonstrationOutput "$name-large.webp") -Width $largeWidth -Quality 88
  Convert-ToWebp $_.FullName (Join-Path $demonstrationOutput "$name-full.webp") -Quality 86
}

$atelierSource = Join-Path $SourceRoot '04-atelier'
$atelierOutput = Join-Path $PublicRoot '04-atelier'
foreach ($width in @(768, 1280, 1600)) {
  Convert-ToWebp (Join-Path $atelierSource 'photo garage.jpeg') (Join-Path $atelierOutput "photo-garage-$width.webp") -Width $width -Quality 80
}
foreach ($width in @(768, 1440, 1920)) {
  Convert-ToWebp (Join-Path $atelierSource 'pexels-gustavo-fring-6870314.jpg') (Join-Path $atelierOutput "confiance-$width.webp") -Width $width -Quality 84
}
foreach ($themeImage in @('c-v01', 'c-v02')) {
  foreach ($width in @(400, 800)) {
    Convert-ToWebp (Join-Path $atelierSource "$themeImage.jpg") (Join-Path $atelierOutput "$themeImage-$width.webp") -Width $width -Quality 89
  }
}
Convert-ToWebp (Join-Path $atelierSource 'Motrio_Logo_Commercial.jpg') (Join-Path $atelierOutput 'motrio-264.webp') -Width 264 -Quality 90

$logoSource = Join-Path $SourceRoot '01-logo'
$logoOutput = Join-Path $PublicRoot '01-logo'
foreach ($name in @('Nico-Lopes-navbar', 'Nico-Lopes-navbar-light')) {
  Convert-ToWebp (Join-Path $logoSource "$name.png") (Join-Path $logoOutput "$name-144.webp") -Width 144 -Lossless
  Convert-ToWebp (Join-Path $logoSource "$name.png") (Join-Path $logoOutput "$name-366.webp") -Width 366 -Lossless
}

$iconSource = Join-Path $SourceRoot '05-services-icons'
$iconOutput = Join-Path $PublicRoot '05-services-icons'
Get-ChildItem -LiteralPath $iconSource -Filter '*.png' | ForEach-Object {
  foreach ($width in @(96, 192)) {
    Convert-ToWebp $_.FullName (Join-Path $iconOutput "$($_.BaseName)-$width.webp") -Width $width -Lossless
  }
}

$videoSource = Join-Path $SourceRoot '03-video'
$videoOutput = Join-Path $PublicRoot '03-video'
foreach ($poster in @('realisations-poster', 'video-v1', 'video-v3', 'video-v4')) {
  Convert-ToWebp (Join-Path $videoSource "$poster.jpg") (Join-Path $videoOutput "$poster-640.webp") -Width 640 -Quality 86
}
