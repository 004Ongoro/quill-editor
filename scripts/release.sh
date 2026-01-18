#!/bin/bash

# QuillEditor Release Script
# Usage: ./scripts/release.sh [version] - chmod +x scripts/release.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Get version from argument or prompt
VERSION=$1
if [ -z "$VERSION" ]; then
    CURRENT_VERSION=$(node -p "require('./package.json').version")
    print_info "Current version: $CURRENT_VERSION"
    read -p "Enter new version (e.g., 1.0.1, 1.1.0, 2.0.0): " VERSION
    
    if [ -z "$VERSION" ]; then
        print_error "Version cannot be empty"
        exit 1
    fi
fi

# Validate version format
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+(-(alpha|beta|rc)\.[0-9]+)?$ ]]; then
    print_error "Invalid version format. Use semantic versioning (e.g., 1.0.0, 1.1.0-alpha.1)"
    exit 1
fi

print_info "Preparing release $VERSION"

# Update package.json version
print_info "Updating package.json..."
npm version $VERSION --no-git-tag-version

# Update CHANGELOG.md
print_info "Updating CHANGELOG.md..."
CURRENT_DATE=$(date +%Y-%m-%d)
sed -i.bak "s/## \[Unreleased\]/## \[Unreleased\]\n\n## \[$VERSION\] - $CURRENT_DATE/" CHANGELOG.md
rm CHANGELOG.md.bak

# Commit changes
print_info "Committing changes..."
git add package.json CHANGELOG.md
git commit -m "chore: release v$VERSION"

# Create tag
print_info "Creating tag v$VERSION..."
git tag -a "v$VERSION" -m "Release v$VERSION"

# Push changes
print_info "Pushing changes and tag..."
git push origin main
git push origin "v$VERSION"

print_info "Release $VERSION prepared successfully!"
print_info "The GitHub Actions workflow will now build and publish the release."
print_info "You can monitor the progress at: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]//; s/\.git$//')/actions"