@echo off
title Google Connect — Launcher

echo Starting Next.js dev server...
start "Google Connect — Dev Server" powershell -NoExit -Command "Set-Location 'C:\Projects\Google Connect'; npm run dev"

echo Starting Stripe webhook listener (auto-restarts if disconnected)...
start "Google Connect — Stripe Listener" powershell -NoExit -Command ^
  "while ($true) { Write-Host '[Stripe] Starting listener...' -ForegroundColor Cyan; & 'C:\Users\User\Downloads\stripe_1.40.9_windows_x86_64\stripe.exe' listen --forward-to http://localhost:3000/api/payments/stripe/webhook; Write-Host '[Stripe] Listener stopped. Restarting in 3s...' -ForegroundColor Yellow; Start-Sleep 3 }"

echo Waiting for server to start...
timeout /t 12 /nobreak >nul

echo Opening browser...
start http://localhost:3000

exit
