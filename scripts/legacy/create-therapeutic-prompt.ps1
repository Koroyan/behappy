# Create Therapeutic Cards Prompt on OpenAI
# PowerShell script for Windows

$ErrorActionPreference = "Stop"

Write-Host "🎴 Creating Therapeutic Cards AI Prompt on OpenAI..." -ForegroundColor Cyan
Write-Host ""

# Check if API key is set
if (-not $env:OPENAI_API_KEY) {
    Write-Host "❌ Error: OPENAI_API_KEY environment variable is not set" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please set it first:" -ForegroundColor Yellow
    Write-Host '  $env:OPENAI_API_KEY = "your-api-key-here"' -ForegroundColor Yellow
    exit 1
}

# Read the prompt content
$promptPath = Join-Path $PSScriptRoot "..\THERAPEUTIC_CARDS_SYSTEM_PROMPT.md"
if (-not (Test-Path $promptPath)) {
    Write-Host "❌ Error: THERAPEUTIC_CARDS_SYSTEM_PROMPT.md not found" -ForegroundColor Red
    exit 1
}

$promptContent = Get-Content $promptPath -Raw

Write-Host "📄 Prompt loaded ($($promptContent.Length) characters)" -ForegroundColor Green
Write-Host "🚀 Uploading to OpenAI..." -ForegroundColor Cyan
Write-Host ""

# Prepare the JSON body
$body = @{
    name = "Therapeutic Cards Master Facilitator"
    description = "Expert therapeutic facilitator for projective card therapy sessions using evidence-based modalities (SFBT, Narrative, EFT, IFS, DBT). Guides 20-30 exchange sessions with emotion, resource, positive/negative, and narrative card protocols. Generates comprehensive session summaries."
    prompt = $promptContent
    tools = @()
    model = "gpt-4o-mini"
    temperature = 0.8
    max_tokens = 4000
} | ConvertTo-Json -Depth 10

# Make the API call
try {
    $response = Invoke-RestMethod -Uri "https://api.openai.com/v1/prompts" `
        -Method Post `
        -Headers @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $env:OPENAI_API_KEY"
        } `
        -Body $body

    Write-Host "✅ Prompt created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Prompt Details:" -ForegroundColor Cyan
    Write-Host "  ID: $($response.id)" -ForegroundColor Yellow
    Write-Host "  Name: $($response.name)" -ForegroundColor White
    Write-Host "  Version: $($response.version)" -ForegroundColor White
    Write-Host ""
    Write-Host "🔧 Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Copy the Prompt ID above" -ForegroundColor White
    Write-Host "2. Open services/cardTherapyService.ts" -ForegroundColor White
    Write-Host "3. Replace the promptId value:" -ForegroundColor White
    Write-Host "   private promptId: string = '$($response.id)';" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 Usage in your app:" -ForegroundColor Cyan
    Write-Host @"
const response = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + apiKey
  },
  body: JSON.stringify({
    prompt: {
      id: '$($response.id)',
      version: '1'
    },
    messages: messages
  })
});
"@ -ForegroundColor Gray

} catch {
    Write-Host "❌ Error creating prompt:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.ErrorDetails) {
        Write-Host ""
        Write-Host "Details:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor White
    }
    
    exit 1
}

Write-Host ""
Write-Host "🎉 All done! Your therapeutic AI is ready to use." -ForegroundColor Green
