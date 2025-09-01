#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔒 HTTPS Deployment Verification...');

// Check environment configuration
console.log('\n🔍 Checking environment configuration...');

const envFiles = ['.env.production', '.env.local', '.env'];
let foundEnvFile = false;

for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    foundEnvFile = true;
    console.log(`✅ Found ${envFile}`);
    const content = fs.readFileSync(envFile, 'utf8');
    
    // Check for HTTPS URLs
    const apiUrlMatch = content.match(/NEXT_PUBLIC_API_URL=(.*)/);
    const wsUrlMatch = content.match(/NEXT_PUBLIC_WS_URL=(.*)/);
    
    if (apiUrlMatch) {
      const url = apiUrlMatch[1];
      if (url.startsWith('https://')) {
        console.log(`✅ NEXT_PUBLIC_API_URL uses HTTPS: ${url}`);
      } else {
        console.log(`❌ NEXT_PUBLIC_API_URL uses HTTP: ${url}`);
      }
    }
    
    if (wsUrlMatch) {
      const url = wsUrlMatch[1];
      if (url.startsWith('wss://')) {
        console.log(`✅ NEXT_PUBLIC_WS_URL uses WSS: ${url}`);
      } else {
        console.log(`❌ NEXT_PUBLIC_WS_URL uses WS: ${url}`);
      }
    }
  }
}

// Check railway.toml
console.log('\n🚂 Checking railway.toml configuration...');
if (fs.existsSync('railway.toml')) {
  const railwayConfig = fs.readFileSync('railway.toml', 'utf8');
  
  // Check environment variables in railway.toml
  const railwayApiUrl = railwayConfig.match(/NEXT_PUBLIC_API_URL\s*=\s*"([^"]+)"/);
  const railwayWsUrl = railwayConfig.match(/NEXT_PUBLIC_WS_URL\s*=\s*"([^"]+)"/);
  
  if (railwayApiUrl) {
    const url = railwayApiUrl[1];
    if (url.startsWith('https://')) {
      console.log(`✅ Railway NEXT_PUBLIC_API_URL uses HTTPS: ${url}`);
    } else {
      console.log(`❌ Railway NEXT_PUBLIC_API_URL uses HTTP: ${url}`);
    }
  }
  
  if (railwayWsUrl) {
    const url = railwayWsUrl[1];
    if (url.startsWith('wss://')) {
      console.log(`✅ Railway NEXT_PUBLIC_WS_URL uses WSS: ${url}`);
    } else {
      console.log(`❌ Railway NEXT_PUBLIC_WS_URL uses WS: ${url}`);
    }
  }
} else {
  console.log('❌ railway.toml not found');
}

// Check API client configuration
console.log('\n📝 Checking API client configuration...');
if (fs.existsSync('src/lib/api.ts')) {
  const apiContent = fs.readFileSync('src/lib/api.ts', 'utf8');
  
  // Check for HTTPS enforcement
  if (apiContent.includes('https://') && apiContent.includes('force HTTPS')) {
    console.log('✅ API client has HTTPS enforcement');
  } else {
    console.log('⚠️ API client might not enforce HTTPS');
  }
  
  // Check for railway.app domain handling
  if (apiContent.includes('railway.app')) {
    console.log('✅ API client has Railway-specific handling');
  } else {
    console.log('⚠️ API client might not handle Railway domains');
  }
} else {
  console.log('❌ src/lib/api.ts not found');
}

// Check for any hardcoded HTTP URLs
console.log('\n🔍 Scanning for hardcoded HTTP URLs...');
const scanDirectories = ['src', 'components', 'lib', 'hooks'];
let foundHttpUrls = false;

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      scanDirectory(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      const content = fs.readFileSync(filePath, 'utf8');
      const httpMatches = content.match(/http:\/\/[^\s'"`]+/g);
      
      if (httpMatches) {
        httpMatches.forEach(match => {
          if (match.includes('railway.app')) {
            console.log(`❌ Found hardcoded HTTP URL in ${filePath}: ${match}`);
            foundHttpUrls = true;
          }
        });
      }
    }
  });
}

scanDirectories.forEach(dir => scanDirectory(dir));

if (!foundHttpUrls) {
  console.log('✅ No hardcoded HTTP URLs found');
}

// Check Next.js configuration
console.log('\n⚙️ Checking Next.js configuration...');
if (fs.existsSync('next.config.ts')) {
  const nextConfig = fs.readFileSync('next.config.ts', 'utf8');
  
  if (nextConfig.includes('output:') && nextConfig.includes('standalone')) {
    console.log('✅ Next.js configured for standalone deployment');
  } else {
    console.log('❌ Next.js not configured for standalone deployment');
  }
} else {
  console.log('❌ next.config.ts not found');
}

// Final recommendations
console.log('\n📋 Deployment Recommendations:');
console.log('1. Set these environment variables in Railway Dashboard:');
console.log('   NEXT_PUBLIC_API_URL=https://backend-production-478f.up.railway.app/api/v1/');
console.log('   NEXT_PUBLIC_WS_URL=wss://backend-production-478f.up.railway.app/api/ws/');
console.log('   NODE_ENV=production');
console.log('2. Redeploy after setting environment variables');
console.log('3. Clear browser cache and test the application');
console.log('4. Check browser dev tools Network tab for HTTPS usage');

// Create a summary file
const summary = {
  timestamp: new Date().toISOString(),
  checks: {
    envFiles: foundEnvFile,
    railwayConfig: fs.existsSync('railway.toml'),
    apiClient: fs.existsSync('src/lib/api.ts'),
    nextConfig: fs.existsSync('next.config.ts'),
    hardcodedHttp: foundHttpUrls
  },
  recommendations: [
    'Set Railway environment variables for HTTPS URLs',
    'Redeploy after configuration changes',
    'Clear browser cache',
    'Verify HTTPS in browser dev tools'
  ]
};

fs.writeFileSync('deployment-verification.json', JSON.stringify(summary, null, 2));
console.log('\n📄 Summary saved to deployment-verification.json');

console.log('\n✅ HTTPS verification complete!');