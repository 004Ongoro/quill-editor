#!/bin/bash

# QuillEditor Pre-release Checklist
# Usage: ./scripts/pre-release.sh - chmod +x scripts/pre-release.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info "Running pre-release checklist..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# 1. Check package.json
print_info "1. Checking package.json..."
node -e "
const pkg = require('./package.json');
const requiredFields = ['name', 'version', 'description', 'main', 'author', 'license'];
const missingFields = requiredFields.filter(field => !pkg[field]);
if (missingFields.length > 0) {
    console.error('Missing required fields:', missingFields);
    process.exit(1);
}
console.log('✓ package.json is valid');
"

# 2. Check main files exist
print_info "2. Checking required files..."
REQUIRED_FILES=("main.js" "preload.js" "index.html" "renderer.js" "styles.css")
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file exists"
    else
        print_error "✗ $file not found"
        exit 1
    fi
done

# 3. Check assets
print_info "3. Checking assets..."
ASSET_FILES=("assets/icons/icon.png" "assets/icons/icon.icns" "assets/icons/icon.ico")
for file in "${ASSET_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file exists"
    else
        print_warn "⚠ $file not found - some builds may fail"
    fi
done

# 4. Check dependencies
print_info "4. Checking dependencies..."
if [ -f "node_modules/.bin/electron-builder" ]; then
    echo "✓ electron-builder installed"
else
    print_warn "⚠ electron-builder not installed, running npm install..."
    npm install
fi

# 5. Test build configuration
print_info "5. Testing build configuration..."
npx electron-builder --help > /dev/null 2>&1 && echo "✓ electron-builder works"

# 6. Run tests if available
print_info "6. Running tests..."
if [ -f "package.json" ] && grep -q "\"test\"" package.json; then
    npm test 2>/dev/null && echo "✓ Tests passed" || print_warn "⚠ Tests failed or not configured"
else
    print_warn "⚠ No tests configured"
fi

# 7. Check for TODO/FIXME comments
print_info "7. Checking for TODO/FIXME comments..."
TODO_COUNT=$(grep -r "TODO\|FIXME" --include="*.js" --include="*.html" --include="*.css" . | grep -v node_modules | wc -l)
if [ $TODO_COUNT -gt 0 ]; then
    print_warn "⚠ Found $TODO_COUNT TODO/FIXME comments:"
    grep -r "TODO\|FIXME" --include="*.js" --include="*.html" --include="*.css" . | grep -v node_modules
else
    echo "✓ No TODO/FIXME comments found"
fi

# 8. Check file sizes
print_info "8. Checking for large files..."
find . -name "*.js" -o -name "*.html" -o -name "*.css" | grep -v node_modules | while read file; do
    size=$(wc -c < "$file")
    if [ $size -gt 1000000 ]; then
        print_warn "⚠ Large file: $file ($((size/1024)) KB)"
    fi
done

print_info "Pre-release checklist completed!"
print_info "If there are warnings above, address them before releasing."
print_info "To create a release, run: ./scripts/release.sh [version]"