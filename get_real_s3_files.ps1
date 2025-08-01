# PowerShell script to get REAL S3 file names from mus86077 bucket

Write-Host "Getting REAL S3 file names from bucket mus86077..." -ForegroundColor Green

# Check if AWS CLI is installed
if (!(Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "AWS CLI not found. Installing..." -ForegroundColor Yellow
    # Install AWS CLI using winget
    winget install Amazon.AWSCLI
}

# List all files in the S3 bucket
Write-Host "`nListing files from S3 bucket mus86077:" -ForegroundColor Cyan
$files = aws s3 ls s3://mus86077 --recursive --region us-east-1

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nS3 Files Found:" -ForegroundColor Green
    $files | ForEach-Object {
        $parts = $_ -split '\s+'
        $size = $parts[2]
        $filename = $parts[3]
        if ($filename) {
            Write-Host "  - $filename (Size: $size bytes)"
        }
    }
    
    # Save to a file for later use
    $files | Out-File -FilePath "s3_files_list.txt"
    Write-Host "`nFile list saved to s3_files_list.txt" -ForegroundColor Green
} else {
    Write-Host "`nError accessing S3 bucket. Please check:" -ForegroundColor Red
    Write-Host "1. AWS credentials are configured (run 'aws configure')"
    Write-Host "2. You have access to bucket mus86077"
    Write-Host "3. The bucket exists in us-east-1 region"
}
