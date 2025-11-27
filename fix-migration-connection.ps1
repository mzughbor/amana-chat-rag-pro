# Fix Migration Connection Issues
Write-Host "`n🔍 فحص اتصال قاعدة البيانات...`n" -ForegroundColor Cyan

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ ملف .env غير موجود!" -ForegroundColor Red
    Write-Host "📝 قم بإنشاء ملف .env وأضف DATABASE_URL" -ForegroundColor Yellow
    exit 1
}

# Load .env file
Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]*)\s*=\s*(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

$dbUrl = $env:DATABASE_URL

if (-not $dbUrl) {
    Write-Host "❌ DATABASE_URL غير موجود في ملف .env" -ForegroundColor Red
    Write-Host "`n📝 خطوات الإصلاح:" -ForegroundColor Yellow
    Write-Host "1. افتح Supabase Dashboard: https://app.supabase.com" -ForegroundColor White
    Write-Host "2. اذهب إلى Settings → Database" -ForegroundColor White
    Write-Host "3. انسخ Connection string (URI format)" -ForegroundColor White
    Write-Host "4. أضف السطر التالي لملف .env:" -ForegroundColor White
    Write-Host "   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`n" -ForegroundColor Gray
    exit 1
}

Write-Host "✅ DATABASE_URL موجود" -ForegroundColor Green
Write-Host "🔗 الاتصال: $($dbUrl.Substring(0, [Math]::Min(60, $dbUrl.Length)))..." -ForegroundColor Gray

# Check if using pooler
if ($dbUrl -match "pooler\.supabase\.com" -and $dbUrl -match ":6543") {
    Write-Host "`n⚠️  تم اكتشاف Supabase Pooler (port 6543)" -ForegroundColor Yellow
    Write-Host "💡 الحل المقترح: استخدم Direct Connection (port 5432)`n" -ForegroundColor Cyan
    
    # Extract project ID
    if ($dbUrl -match "postgres\.([^.]+)") {
        $projectId = $matches[1]
        $directUrl = $dbUrl -replace "pooler\.supabase\.com:6543", "db.$projectId.supabase.co:5432"
        $directUrl = $directUrl -replace "\?pgbouncer=true", ""
        
        Write-Host "🔧 DATABASE_URL المقترح (Direct Connection):" -ForegroundColor Cyan
        Write-Host $directUrl -ForegroundColor White
        Write-Host "`n📝 لتطبيق الإصلاح:" -ForegroundColor Yellow
        Write-Host "1. افتح ملف .env" -ForegroundColor White
        Write-Host "2. استبدل DATABASE_URL بالسطر أعلاه" -ForegroundColor White
        Write-Host "3. أعد تشغيل الأمر`n" -ForegroundColor White
    }
}

# Test connection
Write-Host "`n🧪 اختبار الاتصال..." -ForegroundColor Cyan
try {
    $result = npx prisma db execute --stdin 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ الاتصال ناجح!" -ForegroundColor Green
    } else {
        Write-Host "❌ فشل الاتصال" -ForegroundColor Red
        Write-Host "`n💡 حلول بديلة:" -ForegroundColor Yellow
        Write-Host "1. استخدم Supabase SQL Editor لتطبيق Migration يدوياً" -ForegroundColor White
        Write-Host "2. انسخ محتوى: prisma/migrations/20250101000000_init_refactor/migration.sql" -ForegroundColor White
        Write-Host "3. الصق في Supabase SQL Editor وقم بالتنفيذ" -ForegroundColor White
        Write-Host "4. ثم قم بتسجيل Migration:" -ForegroundColor White
        Write-Host "   npx prisma migrate resolve --applied 20250101000000_init_refactor`n" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ خطأ في الاختبار: $_" -ForegroundColor Red
}

Write-Host "`n📋 ملخص:" -ForegroundColor Cyan
Write-Host "إذا استمرت المشكلة، استخدم Supabase SQL Editor لتطبيق Migration يدوياً`n" -ForegroundColor Yellow

