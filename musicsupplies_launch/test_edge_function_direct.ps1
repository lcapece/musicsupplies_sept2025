# Test Edge Function Directly
Write-Host "Testing send-mailgun-email edge function directly..." -ForegroundColor Cyan

# Your Supabase project details
$projectRef = "ekklokrukxmqlahtonnc"
$supabaseUrl = "https://$projectRef.supabase.co"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgwNzY0NDYsImV4cCI6MjA0MzY1MjQ0Nn0.nYXCBreXVdVNKt6eOdO-JLQAqmscK8xwh5ho8-_RQ10"

$headers = @{
    "Content-Type" = "application/json"
    "apikey" = $anonKey
    "Authorization" = "Bearer $anonKey"
}

$body = @{
    to = "lcapece@optonline.net"
    subject = "Test - Password Reset System"
    text = "This is a test email to verify the Mailgun edge function is working."
    html = "<p>This is a test email to verify the Mailgun edge function is working.</p>"
} | ConvertTo-Json

try {
    Write-Host "Invoking edge function..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "$supabaseUrl/functions/v1/send-mailgun-email" -Method Post -Headers $headers -Body $body
    Write-Host "SUCCESS! Email sent." -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "FAILED!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error Details: $errorBody" -ForegroundColor Red
    }
}
