# PowerShell script to run SQL migration
# Usage: .\run-migration.ps1

Write-Host "`n🚀 Running Database Migration...`n" -ForegroundColor Cyan

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "❌ Error: DATABASE_URL environment variable is not set" -ForegroundColor Red
    Write-Host "Please set it in your .env file or export it" -ForegroundColor Yellow
    exit 1
}

$sqlFile = "prisma/migrations/0001_refactor_to_site_bot_model.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ Error: SQL file not found at $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Reading SQL file: $sqlFile" -ForegroundColor Green
$sqlContent = Get-Content $sqlFile -Raw

Write-Host "`n⚠️  WARNING: This will modify your database structure!" -ForegroundColor Yellow
Write-Host "Make sure you have backed up your database first.`n" -ForegroundColor Yellow

$confirm = Read-Host "Do you want to continue? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Migration cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host "`n🔄 Executing migration...`n" -ForegroundColor Cyan

# Method 1: Using psql with Get-Content
try {
    $env:PGPASSWORD = ($env:DATABASE_URL -split '@')[0] -replace '.*:', ''
    Get-Content $sqlFile | & psql $env:DATABASE_URL
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Migration completed successfully!`n" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Migration failed with exit code: $LASTEXITCODE`n" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "`n❌ Error running migration: $_`n" -ForegroundColor Red
    Write-Host "`n💡 Alternative: Copy the SQL content and run it in Supabase SQL Editor`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: npx prisma generate" -ForegroundColor White
Write-Host "2. Test your application`n" -ForegroundColor White

