#!/bin/bash

# React Native + Expo 개발 환경 검증 스크립트

# nvm 로드
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "═══════════════════════════════════════════════════"
echo "  React Native + Expo 개발 환경 검증"
echo "═══════════════════════════════════════════════════"
echo ""

# 색상 코드
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 검증 함수
check_tool() {
    local name=$1
    local command=$2
    local expected_version=$3
    
    echo -n "Checking $name... "
    
    if result=$(eval "$command" 2>/dev/null); then
        echo -e "${GREEN}✓${NC} $result"
        if [ -n "$expected_version" ]; then
            echo "  (Expected: $expected_version)"
        fi
    else
        echo -e "${RED}✗ Not installed${NC}"
        return 1
    fi
}

echo "1. 패키지 관리자"
check_tool "Homebrew" "brew --version | head -n 1" "5.0.6"

echo ""
echo "2. 버전 관리 도구"
check_tool "Git" "git --version" "2.52.0"

echo ""
echo "3. 파일 감시 도구"
check_tool "Watchman" "watchman --version" "2025.12.15.00"

echo ""
echo "4. Node 버전 관리"
check_tool "nvm" "nvm --version" "0.40.3"

echo ""
echo "5. JavaScript 런타임"
check_tool "Node.js" "node --version" "24.12.0"

echo ""
echo "6. 패키지 매니저"
check_tool "pnpm" "pnpm --version" "10.26.1"

echo ""
echo "7. iOS 개발 환경"
if [ -d "/Applications/Xcode.app" ]; then
    check_tool "Xcode" "xcodebuild -version 2>/dev/null | head -n 1" "16.2"
else
    echo -e "Checking Xcode... ${YELLOW}⚠ Not installed${NC}"
    echo "  Install from App Store or https://developer.apple.com/download/"
fi

echo ""
echo "8. Android 개발 환경"
if [ -n "$ANDROID_HOME" ] && [ -d "$ANDROID_HOME" ]; then
    echo -e "Checking Android SDK... ${GREEN}✓${NC} $ANDROID_HOME"
    if command -v adb &> /dev/null; then
        check_tool "ADB" "adb --version | head -n 1"
    else
        echo -e "Checking ADB... ${YELLOW}⚠ Not in PATH${NC}"
    fi
else
    echo -e "Checking Android Studio... ${YELLOW}⚠ Not configured${NC}"
    echo "  Set ANDROID_HOME environment variable in ~/.zshrc"
fi

echo ""
echo "9. Expo 도구"
check_tool "Expo CLI" "expo --version" "54.0.30"

echo ""
echo "10. EAS 도구"
check_tool "EAS CLI" "eas --version | head -n 1" "16.28.0"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  검증 완료"
echo "═══════════════════════════════════════════════════"
echo ""

# 환경 변수 확인
echo "Environment Variables:"
echo "  NVM_DIR: $NVM_DIR"
echo "  ANDROID_HOME: ${ANDROID_HOME:-'Not set'}"
echo ""

# 다음 단계 안내
echo "다음 단계:"
echo "  - 모든 항목이 설치되었다면 개발을 시작할 수 있습니다!"
echo "  - Xcode나 Android Studio가 미설치된 경우:"
echo "    '개발환경_설정_안내.md' 파일을 참고하세요."
echo ""

