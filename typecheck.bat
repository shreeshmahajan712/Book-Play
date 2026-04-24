@echo off
cd /d "d:\Book&Play\frontend"
node "node_modules\typescript\bin\tsc" --noEmit --project tsconfig.app.json
echo TSC exit code: %ERRORLEVEL%
