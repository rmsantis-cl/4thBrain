param([string]$Task, [string]$Category)
$tracker = "C:\Users\rsant\desar\github\4thBrain\documets\TODO-TRACKER.md"
if (-not $Task) { $Task = Read-Host "Task name" }
if (-not $Category) { 
    Write-Host "1=Implementation, 2=Documentation, 3=Testing"
    $c = Read-Host "Choice"
    $Category = @("Implementation", "Documentation", "Testing & QA")[[int]$c-1]
}
$desc = Read-Host "Description [$Task]"
if (-not $desc) { $desc = $Task }
$dep = Read-Host "Depends on? [none]"
if (-not $dep) { $dep = "none" }

$row = "| $Task | $desc | $dep | pending |"
$marker = @{
    "Implementation" = "### Active Implementation Tasks"
    "Documentation" = "### Documentation Follow-ups"
    "Testing & QA" = "### Testing & QA"
}[$Category]

$content = Get-Content $tracker -Raw
$lines = $content -split "`n"
$idx = -1
for ($i=0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -contains $marker) {
        for ($j=$i+1; $j -lt $lines.Count; $j++) {
            if ($lines[$j] -match "^\s*$") { $idx = $j; break }
        }
        break
    }
}
if ($idx -gt 0) {
    $lines[$idx] = $row + "`n" + $lines[$idx]
    $new = $lines -join "`n"
    Set-Content $tracker $new -Encoding UTF8
    Write-Host "Added: $Task"
} else {
    Write-Error "Could not find section"
}
