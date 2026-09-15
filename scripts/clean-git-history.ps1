# =============================================================================
# Script : Réinitialisation propre de l'historique Git
# Annale229-MBH — Retrait des credentials et données sensibles
# =============================================================================
# Utilisation : Ouvrir PowerShell dans le dossier Annales et lancer :
#   .\scripts\clean-git-history.ps1
# =============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Annale229-MBH — Nettoyage de l'historique Git" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier qu'on est bien dans le bon dossier
if (-not (Test-Path ".git")) {
    Write-Host "ERREUR : Ce script doit être lancé depuis la racine du projet (dossier Annales)." -ForegroundColor Red
    exit 1
}

# Afficher la branche actuelle et le remote
$branch = git rev-parse --abbrev-ref HEAD
$remote = git remote get-url origin 2>$null

Write-Host "Branche actuelle : $branch" -ForegroundColor Yellow
Write-Host "Remote GitHub   : $remote" -ForegroundColor Yellow
Write-Host ""

# Compter les commits
$commitCount = (git rev-list --count HEAD)
Write-Host "Nombre de commits dans l'historique : $commitCount" -ForegroundColor White
Write-Host ""

Write-Host "[1/5] Sauvegarde de la branche actuelle..." -ForegroundColor Green
git branch backup-avant-nettoyage 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "      Branche de sauvegarde créée : backup-avant-nettoyage" -ForegroundColor Gray
} else {
    Write-Host "      (branche de sauvegarde déjà existante, OK)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[2/5] Création d'un historique propre (orphan)..." -ForegroundColor Green
git checkout --orphan clean-history
Write-Host "      Staging de tous les fichiers propres..." -ForegroundColor Gray
git add -A

Write-Host ""
Write-Host "[3/5] Création du premier commit propre..." -ForegroundColor Green
git commit -m "chore: historique reinitialisé - suppression des données sensibles des anciens commits"

Write-Host ""
Write-Host "[4/5] Remplacement de la branche principale..." -ForegroundColor Green
git branch -D $branch
git branch -m $branch

Write-Host ""
Write-Host "[5/5] Force push vers GitHub..." -ForegroundColor Green
Write-Host "      ATTENTION : ceci réécrit l'historique sur GitHub." -ForegroundColor Yellow
git push origin $branch --force

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  ✓ Terminé ! Historique propre poussé sur GitHub." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Actions restantes à faire manuellement :" -ForegroundColor Yellow
Write-Host "  1. Révoquer et régénérer les clés Cloudinary" -ForegroundColor White
Write-Host "  2. Réinitialiser le mot de passe Neon PostgreSQL" -ForegroundColor White
Write-Host "  3. Supprimer et recréer le secret Google OAuth" -ForegroundColor White
Write-Host "  4. Révoquer et régénérer les clés Neon Object Storage (AWS_*)" -ForegroundColor White
Write-Host ""
Write-Host "Toutes les nouvelles clés doivent être mises à jour dans .env.local" -ForegroundColor Gray
Write-Host ""
