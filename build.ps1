$NodeUrl = "https://nodejs.org/dist/v20.12.2/node-v20.12.2-win-x64.zip"
$ZipPath = "node.zip"
$ExtractPath = ".node_temp"
$NodeDir = "$ExtractPath\node-v20.12.2-win-x64"

Invoke-WebRequest -Uri $NodeUrl -OutFile $ZipPath
Expand-Archive -Path $ZipPath -DestinationPath $ExtractPath -Force
$env:PATH = "$pwd\$NodeDir;" + $env:PATH
npm install
npm run build
Remove-Item -Recurse -Force $ExtractPath -ErrorAction SilentlyContinue
Remove-Item -Force $ZipPath -ErrorAction SilentlyContinue
Write-Host "Rebuild Done!"
