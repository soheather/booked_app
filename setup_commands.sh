#!/bin/bash

# React Native + Expo 개발 환경 설정 스크립트
# 사용자가 직접 실행해야 하는 명령어들

echo "=== React Native + Expo 개발 환경 설정 ==="
echo ""

# Homebrew 권한 수정
echo "1. Homebrew 권한 수정 및 업데이트..."
sudo chown -R $(whoami) /opt/homebrew/Cellar
brew update
brew upgrade

echo ""
echo "2. Git 업데이트..."
brew upgrade git

echo ""
echo "3. Watchman 설치..."
brew install watchman

echo ""
echo "=== 설치 완료된 항목 확인 ==="
echo "Homebrew: $(brew --version | head -n 1)"
echo "Git: $(git --version)"
echo "Watchman: $(watchman --version)"
echo "nvm: $(nvm --version 2>/dev/null || echo 'Not loaded - run: source ~/.zshrc')"
echo "Node.js: $(node --version)"
echo "pnpm: $(pnpm --version)"
echo "Expo: $(expo --version)"
echo "EAS: $(eas --version | head -n 1)"

echo ""
echo "=== 다음 단계 ==="
echo ""
echo "4. Xcode 16.2 설치 (App Store 또는 Apple Developer)"
echo "   - App Store 열기: open -a 'App Store'"
echo "   - 또는 다운로드: https://developer.apple.com/download/all/"
echo ""
echo "   설치 후 실행:"
echo "   sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer"
echo "   sudo xcodebuild -license accept"
echo "   xcodebuild -version"
echo ""
echo "5. Android Studio 2025.2.2.7 설치"
echo "   - Homebrew로 설치: brew install --cask android-studio"
echo "   - 또는 다운로드: https://developer.android.com/studio"
echo ""
echo "   설치 후 환경 변수 설정 (~/.zshrc에 추가):"
echo "   export ANDROID_HOME=\$HOME/Library/Android/sdk"
echo "   export PATH=\$PATH:\$ANDROID_HOME/emulator"
echo "   export PATH=\$PATH:\$ANDROID_HOME/platform-tools"
echo "   export PATH=\$PATH:\$ANDROID_HOME/tools"
echo "   export PATH=\$PATH:\$ANDROID_HOME/tools/bin"
echo ""
echo "   적용: source ~/.zshrc"
echo ""


