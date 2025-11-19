# PowerShell script to validate Amplify deployment and connectivity
# Tests connectivity to DynamoDB, S3, Cognito, and API Gateway

Write-Host "🔍 Validating AWS Amplify Deployment and Connectivity" -ForegroundColor Cyan
Write-Host ""

$appId = "d9ifmpfg9093g"
$region = "us-east-1"

# Step 1: Check Amplify App Status
Write-Host "Step 1: Checking Amplify App Status..." -ForegroundColor Yellow
try {
    $app = aws amplify get-app --app-id $appId --region $region --output json | ConvertFrom-Json
    Write-Host "[OK] Amplify App: $($app.app.name)" -ForegroundColor Green
    Write-Host "    App ID: $appId" -ForegroundColor Gray
    Write-Host "    Default Domain: $($app.app.defaultDomain)" -ForegroundColor Gray
    Write-Host "    Status: $($app.app.productionBranch.status)" -ForegroundColor Gray
    Write-Host "    Last Deploy: $($app.app.productionBranch.lastDeployTime)" -ForegroundColor Gray
} catch {
    Write-Host "[ERROR] Failed to get Amplify app info" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Validate Environment Variables
Write-Host "Step 2: Validating Environment Variables..." -ForegroundColor Yellow
try {
    $branch = aws amplify get-branch --app-id $appId --branch-name main --region $region --output json | ConvertFrom-Json
    $envVars = $branch.branch.environmentVariables
    
    $requiredVars = @(
        "NEXT_PUBLIC_API_URL",
        "NEXT_PUBLIC_COGNITO_USER_POOL_ID",
        "NEXT_PUBLIC_COGNITO_CLIENT_ID",
        "NEXT_PUBLIC_AWS_REGION"
    )
    
    $allPresent = $true
    foreach ($var in $requiredVars) {
        $found = $envVars | Where-Object { $_.name -eq $var }
        if ($found) {
            Write-Host "[OK] $var = $($found.value)" -ForegroundColor Green
        } else {
            Write-Host "[MISSING] $var" -ForegroundColor Red
            $allPresent = $false
        }
    }
    
    if (-not $allPresent) {
        Write-Host "[WARNING] Some required environment variables are missing!" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[ERROR] Failed to get environment variables" -ForegroundColor Red
}

Write-Host ""

# Step 3: Test API Gateway Connectivity
Write-Host "Step 3: Testing API Gateway Connectivity..." -ForegroundColor Yellow
$apiUrl = "https://54xpwhf7jd.execute-api.us-east-1.amazonaws.com"
try {
    $response = Invoke-WebRequest -Uri "$apiUrl/podcasts" -Method GET -UseBasicParsing -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 401) {
        Write-Host "[OK] API Gateway is reachable (Status: $($response.StatusCode))" -ForegroundColor Green
        Write-Host "    Note: 401 is expected without authentication token" -ForegroundColor Gray
    } else {
        Write-Host "[WARNING] API Gateway returned status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "[OK] API Gateway is reachable (401 = Authentication required)" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] API Gateway connectivity test failed: $_" -ForegroundColor Red
    }
}

Write-Host ""

# Step 4: Test Cognito User Pool
Write-Host "Step 4: Testing Cognito User Pool..." -ForegroundColor Yellow
$userPoolId = "us-east-1_lvLcARe2P"
try {
    $cognito = aws cognito-idp describe-user-pool --user-pool-id $userPoolId --region $region --output json | ConvertFrom-Json
    Write-Host "[OK] Cognito User Pool exists: $($cognito.UserPool.Name)" -ForegroundColor Green
    Write-Host "    User Pool ID: $userPoolId" -ForegroundColor Gray
    Write-Host "    Status: $($cognito.UserPool.Status)" -ForegroundColor Gray
} catch {
    Write-Host "[ERROR] Failed to access Cognito User Pool: $_" -ForegroundColor Red
}

Write-Host ""

# Step 5: Test DynamoDB Tables
Write-Host "Step 5: Testing DynamoDB Tables..." -ForegroundColor Yellow
$tables = @(
    "podcasts",
    "runs",
    "episodes",
    "run_events"
)

foreach ($table in $tables) {
    try {
        $tableInfo = aws dynamodb describe-table --table-name $table --region $region --output json 2>$null | ConvertFrom-Json
        if ($tableInfo) {
            Write-Host "[OK] DynamoDB Table: $table (Status: $($tableInfo.Table.TableStatus))" -ForegroundColor Green
        }
    } catch {
        Write-Host "[ERROR] DynamoDB Table '$table' not found or inaccessible" -ForegroundColor Red
    }
}

Write-Host ""

# Step 6: Test S3 Buckets
Write-Host "Step 6: Testing S3 Buckets..." -ForegroundColor Yellow
$buckets = @(
    "podcast-platform-media-098478926952",
    "podcast-platform-rss-098478926952",
    "podcast-platform-frontend-098478926952"
)

foreach ($bucket in $buckets) {
    try {
        $bucketInfo = aws s3api head-bucket --bucket $bucket --region $region 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] S3 Bucket: $bucket" -ForegroundColor Green
        } else {
            Write-Host "[ERROR] S3 Bucket '$bucket' not accessible" -ForegroundColor Red
        }
    } catch {
        Write-Host "[ERROR] S3 Bucket '$bucket' check failed: $_" -ForegroundColor Red
    }
}

Write-Host ""

# Step 7: Test Amplify Domain
Write-Host "Step 7: Testing Amplify Domain..." -ForegroundColor Yellow
$amplifyDomain = "$appId.amplifyapp.com"
$amplifyUrl = "https://main.$amplifyDomain"
try {
    $response = Invoke-WebRequest -Uri $amplifyUrl -Method GET -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "[OK] Amplify domain is accessible: $amplifyUrl" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Amplify domain returned status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[WARNING] Amplify domain test failed (may still be deploying): $_" -ForegroundColor Yellow
    Write-Host "    URL: $amplifyUrl" -ForegroundColor Gray
}

Write-Host ""

# Summary
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "VALIDATION SUMMARY" -ForegroundColor Yellow
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""
Write-Host "Amplify App URL: https://main.$amplifyDomain" -ForegroundColor White
Write-Host "API Gateway: $apiUrl" -ForegroundColor White
Write-Host "Cognito User Pool: $userPoolId" -ForegroundColor White
Write-Host ""
Write-Host "✅ Validation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Visit https://main.$amplifyDomain to test the frontend" -ForegroundColor White
Write-Host "2. Try logging in with Cognito" -ForegroundColor White
Write-Host "3. Test creating a podcast" -ForegroundColor White
Write-Host "4. Check browser console for errors" -ForegroundColor White
Write-Host ""

