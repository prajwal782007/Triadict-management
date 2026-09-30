@echo off
echo Initializing Vite React project...
call npm create vite@latest temp-app -- --template react

echo Moving files...
xcopy temp-app\* . /E /Y
xcopy temp-app\.gitignore . /Y
rmdir /s /q temp-app

echo Installing base dependencies...
call npm install

echo Installing additional dependencies...
call npm install @supabase/supabase-js recharts lucide-react react-router-dom

echo Installing Tailwind CSS...
call npm install -D tailwindcss postcss autoprefixer
call npx tailwindcss init -p

echo Setup Complete!
