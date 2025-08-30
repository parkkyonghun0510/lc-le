#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting deployment verification...');

// Check if required files exist
const requiredFiles = [
  'package.json',
  'next.config.ts',
  'Dockerfile',
  'railway.toml',
  '.env.production'
];

console.log('\n📁 Checking required files...');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} is missing`);
    process.exit(1);
  }
});

// Check package.json scripts
console.log('\n📦 Checking package.json scripts...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = ['build', 'start'];

requiredScripts.forEach(script => {
  if (packageJson.scripts && packageJson.scripts[script]) {
    console.log(`✅ Script '${script}' exists`);
  } else {
    console.log(`❌ Script '${script}' is missing`);
    process.exit(1);
  }
});

// Check Next.js configuration
console.log('\n⚙️ Checking Next.js configuration...');
try {
  const nextConfigContent = fs.readFileSync('next.config.ts', 'utf8');
  if (nextConfigContent.includes('output: \'standalone\'') || nextConfigContent.includes('output: "standalone"')) {
    console.log('✅ Standalone output is configured');
  } else {
    console.log('❌ Standalone output is not configured');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Error reading next.config.ts:', error.message);
  process.exit(1);
}

// Test build process
console.log('\n🔨 Testing build process...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed successfully');
} catch (error) {
  console.log('❌ Build failed:', error.message);
  process.exit(1);
}

// Check if standalone output was generated
console.log('\n📂 Checking build output...');
const standalonePath = '.next/standalone';
if (fs.existsSync(standalonePath)) {
  console.log('✅ Standalone output generated');
  
  // Check if server.js exists
  const serverJsPath = path.join(standalonePath, 'server.js');
  if (fs.existsSync(serverJsPath)) {
    console.log('✅ server.js exists in standalone output');
  } else {
    console.log('❌ server.js not found in standalone output');
    process.exit(1);
  }
} else {
  console.log('❌ Standalone output not generated');
  process.exit(1);
}

// Check static files
const staticPath = '.next/static';
if (fs.existsSync(staticPath)) {
  console.log('✅ Static files generated');
} else {
  console.log('❌ Static files not generated');
  process.exit(1);
}

// Check Dockerfile syntax
console.log('\n🐳 Checking Dockerfile...');
try {
  const dockerfileContent = fs.readFileSync('Dockerfile', 'utf8');
  if (dockerfileContent.includes('FROM node:20-alpine')) {
    console.log('✅ Dockerfile uses Node.js 20');
  } else {
    console.log('⚠️ Dockerfile might be using an older Node.js version');
  }
  
  if (dockerfileContent.includes('COPY --from=builder /app/.next/standalone')) {
    console.log('✅ Dockerfile copies standalone output');
  } else {
    console.log('❌ Dockerfile does not copy standalone output correctly');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Error reading Dockerfile:', error.message);
  process.exit(1);
}

// Check railway.toml
console.log('\n🚂 Checking railway.toml...');
try {
  const railwayConfig = fs.readFileSync('railway.toml', 'utf8');
  if (railwayConfig.includes('builder = "dockerfile"')) {
    console.log('✅ Railway configured to use Dockerfile');
  } else {
    console.log('❌ Railway not configured to use Dockerfile');
    process.exit(1);
  }
  
  if (railwayConfig.includes('startCommand = "node server.js"')) {
    console.log('✅ Railway start command is correct');
  } else {
    console.log('❌ Railway start command is incorrect');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Error reading railway.toml:', error.message);
  process.exit(1);
}

console.log('\n🎉 All deployment verification checks passed!');
console.log('\n📋 Next steps:');
console.log('1. Commit and push your changes to GitHub');
console.log('2. Deploy to Railway using the GitHub integration');
console.log('3. Set environment variables in Railway Dashboard');
console.log('4. Monitor deployment logs for any issues');