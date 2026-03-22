@echo off
chcp 65001 >nul
title Hexo 自动部署脚本
echo =============================
echo 🚀 Hexo 自动部署开始！
echo =============================

:: 生成 commit 信息，格式：Update on YYYY-MM-DD HH:MM
for /f "tokens=1-5 delims=/: " %%a in ("%date% %time%") do (
    set commit_msg=Update on %%a-%%b-%%c %%d:%%e
)

echo.
echo 📂 当前目录：%cd%
echo 📂 当前 Git 状态（源码仓库）:
git status
echo.

:: 拉取远程最新代码，避免冲突
echo 🔄 尝试拉取远程仓库最新代码...
git pull origin master
if %ERRORLEVEL% neq 0 (
    echo ⚠️ 注意：拉取远程仓库失败，请手动检查网络或仓库状态
    echo.
)

echo ✅ 提交 Markdown 和配置更改到源码仓库...
git add .
git commit -m "%commit_msg%"
git push origin master --force
if %ERRORLEVEL% neq 0 (
    echo ❌ Git 源码推送失败，请检查远程仓库配置！
    pause
    exit /b
)
echo ✅ 源码提交完成！

echo.
echo 🧹 清理旧的 Hexo 生成文件...
call hexo clean
if %ERRORLEVEL% neq 0 (
    echo ❌ Hexo clean 失败！
    pause
    exit /b
)
echo ✅ Hexo clean 成功！

echo.
echo ⚙️ 生成静态网页...
call hexo g
if %ERRORLEVEL% neq 0 (
    echo ❌ Hexo 生成失败！
    pause
    exit /b
)
echo ✅ 网页生成成功！

echo.
echo 🚀 推送到 GitHub Pages 仓库...
call hexo d
if %ERRORLEVEL% neq 0 (
    echo ❌ 部署失败！
    pause
    exit /b
)
echo ✅ 部署成功！

echo.
echo 🌐 你的网站已部署到：
echo https://zjncs.github.io

echo.
echo ✅ 所有步骤完成！
pause
