param(
  [string]$SourceRoot = (Join-Path $PSScriptRoot '..\media-originals\public\ressources\03-video'),
  [string]$PublicRoot = (Join-Path $PSScriptRoot '..\public\ressources\03-video')
)

$ErrorActionPreference = 'Stop'
$ffmpeg = (Get-Command ffmpeg -ErrorAction Stop).Source

$videos = @(
  @{
    Source = 'WhatsApp Video 2026-10-08 at 07.47.39.mp4'
    Gallery = 'video-v1-full.mp4'
    Hero = 'video-v1-hero.mp4'
    HeroStart = 96
  },
  @{
    Source = 'WhatsApp Video 2026-10-08 at 07.47.40.mp4'
    Gallery = 'video-v4-full.mp4'
    Hero = 'video-v4-hero.mp4'
    HeroStart = 18
  },
  @{
    Source = 'WhatsApp Video 2026-10-08 at 07.47.41.mp4'
    Gallery = 'video-v3-full.mp4'
    Hero = 'video-v3-hero.mp4'
    HeroStart = 96
  }
)

New-Item -ItemType Directory -Path $PublicRoot -Force | Out-Null

foreach ($video in $videos) {
  $source = Join-Path $SourceRoot $video.Source
  if (-not (Test-Path -LiteralPath $source)) {
    throw "Missing video source: $source"
  }

  $galleryOutput = Join-Path $PublicRoot $video.Gallery
  & $ffmpeg -hide_banner -loglevel error -y `
    -i $source `
    -map '0:v:0' -map '0:a?' `
    -c:v libx264 -preset slow -crf 24 -profile:v high -level 3.1 -pix_fmt yuv420p `
    -c:a copy `
    -movflags '+faststart' `
    $galleryOutput
  if ($LASTEXITCODE -ne 0) {
    throw "Gallery video conversion failed for $source"
  }

  $heroOutput = Join-Path $PublicRoot $video.Hero
  & $ffmpeg -hide_banner -loglevel error -y `
    -ss $video.HeroStart -t 8 -i $source `
    -map '0:v:0' -an `
    -c:v libx264 -preset slow -crf 24 -profile:v high -level 3.1 -pix_fmt yuv420p `
    -movflags '+faststart' `
    $heroOutput
  if ($LASTEXITCODE -ne 0) {
    throw "Hero video conversion failed for $source"
  }
}
