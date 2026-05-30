param([string]$msg)

if (-not $msg) {
  Write-Host "❌ Commit message required"
  exit
}

git add .
git commit -m $msg
git push

Write-Host "✨ Done."