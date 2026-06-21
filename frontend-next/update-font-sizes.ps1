# Script per aumentare font sizes del 20%
$files = @(
    "components\NavBar.tsx",
    "app\login\page.tsx",
    "app\register\page.tsx",
    "app\settings\page.tsx",
    "app\ai\page.tsx",
    "app\portfolio\page.tsx",
    "app\scanner\page.tsx",
    "app\watchlists\page.tsx",
    "components\watchlist\WatchlistSidebar.tsx",
    "components\watchlist\WatchlistTable.tsx",
    "components\AiChatPanel.tsx",
    "components\watchlist\ItemDetailsDrawer.tsx",
    "components\watchlist\AddFromScannerModal.tsx"
)

foreach ($file in $files) {
    $content = Get-Content $file -Raw
    
    # Mappa delle sostituzioni fontSize (aumenta del 20%)
    $replacements = @{
        "fontSize: '9px'" = "fontSize: '10.8px'"
        "fontSize: '10px'" = "fontSize: '12px'"
        "fontSize: '10.8px'" = "fontSize: '13px'"
        "fontSize: '11px'" = "fontSize: '13.2px'"
        "fontSize: '12px'" = "fontSize: '14.4px'"
        "fontSize: '13px'" = "fontSize: '15.6px'"
        "fontSize: '14px'" = "fontSize: '16.8px'"
        "fontSize: '16px'" = "fontSize: '19.2px'"
        "fontSize: '18px'" = "fontSize: '21.6px'"
        "fontSize: '20px'" = "fontSize: '24px'"
        "fontSize: '22px'" = "fontSize: '26.4px'"
        "fontSize: '32px'" = "fontSize: '38.4px'"
        "fontSize: '48px'" = "fontSize: '57.6px'"
    }
    
    foreach ($key in $replacements.Keys) {
        $content = $content -replace [regex]::Escape($key), $replacements[$key]
    }
    
    Set-Content -Path $file -Value $content -NoNewline
    Write-Host "Updated: $file"
}
