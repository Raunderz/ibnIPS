# Run all of these from your app folder and paste the output

Write-Host "=== FOLDER STRUCTURE ===" 
ls -Attributes Directory | Select-Object Name

Write-Host "`n=== package.json ===" 
cat package.json

Write-Host "`n=== metro.config.js ===" 
cat metro.config.js

Write-Host "`n=== babel.config.js ===" 
cat babel.config.js

Write-Host "`n=== app.json ===" 
cat app.json

Write-Host "`n=== node_modules check ===" 
Test-Path node_modules\expo
Test-Path node_modules\react-native
Test-Path node_modules\@react-navigation

Write-Host "`n=== eas.json (if exists) ===" 
if (Test-Path eas.json) { cat eas.json } else { Write-Host "eas.json not found" }

Write-Host "`n=== TypeScript check ===" 
Test-Path tsconfig.json