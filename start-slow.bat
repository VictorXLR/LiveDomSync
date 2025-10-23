@echo off
echo Starting LiveDOMSync with SLOWER reload (5 second delay)...
echo.
echo Starting WebSocket server on port 3001...
start "LiveDOMSync Server (Slow)" cmd /k "npm run server:slow"
timeout /t 2 /nobreak >nul
echo.
echo Starting HTTP server on port 8000...
start "HTTP Server" cmd /k "python -m http.server 8000"
timeout /t 2 /nobreak >nul
echo.
echo ========================================
echo LiveDOMSync is ready!
echo ========================================
echo.
echo WebSocket Server: ws://localhost:3001
echo HTTP Server:      http://localhost:8000
echo Reload Delay:     5000ms (5 seconds)
echo.
echo Open in browser:  http://localhost:8000/test.html
echo.
echo Press any key to open in browser...
pause >nul
start http://localhost:8000/test.html


