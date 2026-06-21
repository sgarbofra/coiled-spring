# PowerShell test script for DELETE /api/admin/delete-user endpoint
# Usage: .\test_delete_user.ps1 -Email "user@example.com"

param(
    [string]$Email = "test@example.com"
)

$AdminSecret = "coiledspring_dev"
$BaseUrl = "http://localhost:8000"

Write-Host "======================================"
Write-Host "Testing DELETE /api/admin/delete-user"
Write-Host "======================================"
Write-Host ""
Write-Host "Target email: $Email"
Write-Host "Admin secret: $AdminSecret"
Write-Host ""

$headers = @{
    "X-Admin-Secret" = $AdminSecret
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod `
        -Uri "$BaseUrl/api/admin/delete-user?email=$Email" `
        -Method DELETE `
        -Headers $headers

    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host ""
    $response | ConvertTo-Json -Depth 3
}
catch {
    Write-Host "ERROR!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.Value__)"
    Write-Host "Message: $($_.Exception.Message)"

    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)"
    }
}

Write-Host ""
Write-Host "======================================"
Write-Host "Test complete"
Write-Host "======================================"
