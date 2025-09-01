#!/bin/bash
# Railway Production Deployment Validation Script
# Run this script to validate your Railway deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="https://lc-workflow-backend-production.up.railway.app"
FRONTEND_URL="https://lc-workflow-frontend-production.up.railway.app"

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Check if URL is accessible
check_url() {
    local url=$1
    local name=$2
    local expected_status=${3:-200}
    
    echo -n "Checking $name... "
    if curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" | grep -q "$expected_status"; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        return 1
    fi
}

# Check SSL certificate
check_ssl() {
    local url=$1
    local name=$2
    
    echo -n "Checking SSL for $name... "
    if curl -s --max-time 10 "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Valid${NC}"
        return 0
    else
        echo -e "${RED}❌ Invalid${NC}"
        return 1
    fi
}

# Check service health
check_health() {
    local url=$1
    local name=$2
    
    echo -n "Checking health of $name... "
    response=$(curl -s --max-time 10 "$url")
    if [[ "$response" == *"healthy"* ]] || [[ "$response" == *"ok"* ]]; then
        echo -e "${GREEN}✅ Healthy${NC}"
        return 0
    else
        echo -e "${RED}❌ Unhealthy${NC}"
        return 1
    fi
}

# Check MINIO integration
check_minio() {
    echo -n "Checking MINIO integration... "
    
    response=$(curl -s --max-time 10 "$BACKEND_URL/api/v1/health/minio" 2>/dev/null || echo "")
    if [[ "$response" == *"healthy"* ]] || [[ "$response" == *"connected"* ]]; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        return 1
    fi
}

# Check file listing
check_file_listing() {
    echo -n "Checking file listing API... "
    
    response=$(curl -s --max-time 10 "$BACKEND_URL/api/v1/files?page=1&size=10" 2>/dev/null || echo "")
    if [[ "$response" == *"data"* ]] || [[ "$response" == *"files"* ]]; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        return 1
    fi
}

# Check CORS configuration
check_cors() {
    echo -n "Checking CORS configuration... "
    
    response=$(curl -s -H "Origin: $FRONTEND_URL" --max-time 10 "$BACKEND_URL/api/v1/health" 2>/dev/null || echo "")
    if [[ "$response" == *"healthy"* ]]; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        return 1
    fi
}

# Main validation function
main() {
    log "Starting Railway Production Deployment Validation"
    log "==========================================="
    
    local errors=0
    
    # Backend checks
    info "🔍 Backend Service Checks:"
    check_url "$BACKEND_URL/api/v1/health" "Backend Health" "200" || ((errors++))
    check_ssl "$BACKEND_URL" "Backend SSL" || ((errors++))
    check_health "$BACKEND_URL/api/v1/health" "Backend Health" || ((errors++))
    check_minio || ((errors++))
    check_file_listing || ((errors++))
    
    # Frontend checks
    info "🔍 Frontend Service Checks:"
    check_url "$FRONTEND_URL/healthz" "Frontend Health" "200" || ((errors++))
    check_ssl "$FRONTEND_URL" "Frontend SSL" || ((errors++))
    check_url "$FRONTEND_URL" "Frontend App" || ((errors++))
    
    # Integration checks
    info "🔗 Integration Checks:"
    check_cors || ((errors++))
    
    # Summary
    echo
    log "==========================================="
    if [ $errors -eq 0 ]; then
        log "🎉 All checks passed! Deployment is ready for production."
    else
        error "⚠️  $errors check(s) failed. Please review the issues above."
        warning "Check Railway dashboard for detailed logs and configuration."
    fi
    
    log "==========================================="
    info "Next Steps:"
    echo "1. Set correct environment variables in Railway dashboard"
    echo "2. Redeploy services if needed"
    echo "3. Run this script again to verify fixes"
    echo "4. Test file upload/download functionality"
    echo
}

# Run main function
main