#!/bin/bash

echo "🔍 Scanning for exposed secrets..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

HAS_ISSUES=0

# Check for service role keys
echo "Checking for service role keys..."
if git log --all --source --full-history -S "service_role" | grep -iE "service.role|serviceRole" > /dev/null; then
  echo -e "${RED}❌ CRITICAL: Service role key references found in git history!${NC}"
  HAS_ISSUES=1
else
  echo -e "${GREEN}✅ No service role keys found${NC}"
fi

# Check for API keys
echo "Checking for API keys..."
if git grep -iE "(api[_-]?key|apikey|api[_-]?secret)" -- '*.ts' '*.tsx' '*.js' '*.jsx' | grep -v "VITE_SUPABASE_PUBLISHABLE_KEY" | grep -v "node_modules" > /dev/null; then
  echo -e "${YELLOW}⚠️  WARNING: Potential API keys found in code${NC}"
  git grep -iE "(api[_-]?key|apikey|api[_-]?secret)" -- '*.ts' '*.tsx' '*.js' '*.jsx' | grep -v "VITE_SUPABASE_PUBLISHABLE_KEY" | grep -v "node_modules"
  HAS_ISSUES=1
else
  echo -e "${GREEN}✅ No hardcoded API keys found${NC}"
fi

# Check for passwords
echo "Checking for hardcoded passwords..."
if git grep -iE "(password\s*=\s*['\"][^'\"]+['\"])" -- '*.ts' '*.tsx' '*.js' '*.jsx' | grep -v "node_modules" | grep -v "test" > /dev/null; then
  echo -e "${YELLOW}⚠️  WARNING: Potential hardcoded passwords found${NC}"
  HAS_ISSUES=1
else
  echo -e "${GREEN}✅ No hardcoded passwords found${NC}"
fi

# Check .env is in .gitignore
echo "Checking .gitignore..."
if grep -q "^\.env$" .gitignore; then
  echo -e "${GREEN}✅ .env is in .gitignore${NC}"
else
  echo -e "${YELLOW}⚠️  WARNING: .env not found in .gitignore${NC}"
  HAS_ISSUES=1
fi

# Check if .env is tracked
if git ls-files | grep -q "^\.env$"; then
  echo -e "${RED}❌ CRITICAL: .env is tracked in git!${NC}"
  HAS_ISSUES=1
else
  echo -e "${GREEN}✅ .env is not tracked${NC}"
fi

echo ""
if [ $HAS_ISSUES -eq 0 ]; then
  echo -e "${GREEN}🎉 All security checks passed!${NC}"
  exit 0
else
  echo -e "${RED}⚠️  Security issues detected. Please review and fix.${NC}"
  exit 1
fi
