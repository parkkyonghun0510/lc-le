#!/usr/bin/env node
/**
 * Frontend Settings Configuration Test
 * Tests the frontend settings implementation and configuration
 */

const fs = require('fs');
const path = require('path');

function testFrontendSettings() {
    console.log('🎨 Frontend Settings Configuration Test');
    console.log('=' .repeat(50));
    
    const issues = [];
    const frontendDir = 'lc-workflow-frontend';
    
    // 1. Environment Configuration
    console.log('\n1️⃣ Environment Configuration');
    
    const envPath = path.join(frontendDir, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        console.log('✅ .env file exists');
        
        // Check required environment variables
        const requiredVars = [
            'NEXT_PUBLIC_API_URL',
            'NEXT_PUBLIC_WS_URL',
            'NEXT_SECRET_KEY'
        ];
        
        for (const varName of requiredVars) {
            if (envContent.includes(varName)) {
                const match = envContent.match(new RegExp(`${varName}=(.+)`));
                if (match) {
                    const value = match[1].trim();
                    if (varName.includes('SECRET')) {
                        console.log(`✅ ${varName}: ***`);
                    } else {
                        console.log(`✅ ${varName}: ${value}`);
                    }
                } else {
                    issues.push(`${varName} is defined but has no value`);
                }
            } else {
                issues.push(`Missing environment variable: ${varName}`);
            }
        }
        
        // Check API URL configuration
        if (envContent.includes('localhost:8000')) {
            console.log('📍 Configured for local development');
        } else if (envContent.includes('railway.app')) {
            console.log('📍 Configured for Railway production');
        } else {
            issues.push('API URL configuration unclear');
        }
        
    } else {
        issues.push('.env file not found in frontend directory');
    }
    
    // 2. Package Configuration
    console.log('\n2️⃣ Package Configuration');
    
    const packagePath = path.join(frontendDir, 'package.json');
    if (fs.existsSync(packagePath)) {
        const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        console.log('✅ package.json exists');
        
        // Check key dependencies
        const keyDeps = [
            '@tanstack/react-query',
            'axios',
            'react-hot-toast',
            '@heroicons/react',
            '@headlessui/react'
        ];
        
        console.log('📦 Key dependencies:');
        for (const dep of keyDeps) {
            if (packageContent.dependencies[dep]) {
                console.log(`   ✅ ${dep}: ${packageContent.dependencies[dep]}`);
            } else {
                issues.push(`Missing dependency: ${dep}`);
            }
        }
        
        // Check scripts
        const requiredScripts = ['dev', 'build', 'start'];
        console.log('🔧 Scripts:');
        for (const script of requiredScripts) {
            if (packageContent.scripts[script]) {
                console.log(`   ✅ ${script}: ${packageContent.scripts[script]}`);
            } else {
                issues.push(`Missing script: ${script}`);
            }
        }
        
    } else {
        issues.push('package.json not found in frontend directory');
    }
    
    // 3. Settings Implementation Files
    console.log('\n3️⃣ Settings Implementation Files');
    
    const settingsFiles = [
        'src/app/settings/page.tsx',
        'src/hooks/useSettings.ts',
        'src/lib/api.ts',
        'src/lib/handleApiError.ts'
    ];
    
    for (const file of settingsFiles) {
        const filePath = path.join(frontendDir, file);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            console.log(`✅ ${file} exists (${Math.round(content.length / 1024)}KB)`);
            
            // Check for key implementations
            if (file.includes('useSettings.ts')) {
                const hooks = [
                    'useSettings',
                    'useUpdateSetting',
                    'useBulkUpdateSettings',
                    'useInitializeSettings'
                ];
                
                for (const hook of hooks) {
                    if (content.includes(`export const ${hook}`)) {
                        console.log(`   ✅ ${hook} hook implemented`);
                    } else {
                        issues.push(`Missing hook: ${hook}`);
                    }
                }
            }
            
            if (file.includes('settings/page.tsx')) {
                const sections = [
                    'GeneralSettings',
                    'SecuritySettings', 
                    'UserManagementSettings',
                    'ApplicationSettings',
                    'NotificationSettings'
                ];
                
                for (const section of sections) {
                    if (content.includes(`function ${section}`)) {
                        console.log(`   ✅ ${section} component implemented`);
                    } else {
                        issues.push(`Missing settings section: ${section}`);
                    }
                }
            }
            
        } else {
            issues.push(`Missing file: ${file}`);
        }
    }
    
    // 4. API Client Configuration
    console.log('\n4️⃣ API Client Configuration');
    
    const apiPath = path.join(frontendDir, 'src/lib/api.ts');
    if (fs.existsSync(apiPath)) {
        const apiContent = fs.readFileSync(apiPath, 'utf8');
        
        // Check API client features
        const features = [
            'setupInterceptors',
            'Authorization',
            'withCredentials',
            'handleApiError'
        ];
        
        for (const feature of features) {
            if (apiContent.includes(feature)) {
                console.log(`   ✅ ${feature} configured`);
            } else {
                issues.push(`API client missing: ${feature}`);
            }
        }
        
        // Check base URL configuration
        if (apiContent.includes('NEXT_PUBLIC_API_URL')) {
            console.log('   ✅ Base URL from environment variable');
        } else {
            issues.push('API base URL not using environment variable');
        }
        
    } else {
        issues.push('API client file not found');
    }
    
    // 5. TypeScript Configuration
    console.log('\n5️⃣ TypeScript Configuration');
    
    const tsConfigPath = path.join(frontendDir, 'tsconfig.json');
    if (fs.existsSync(tsConfigPath)) {
        console.log('✅ TypeScript configuration exists');
    } else {
        issues.push('TypeScript configuration missing');
    }
    
    // 6. Next.js Configuration
    console.log('\n6️⃣ Next.js Configuration');
    
    const nextConfigPath = path.join(frontendDir, 'next.config.ts');
    if (fs.existsSync(nextConfigPath)) {
        console.log('✅ Next.js configuration exists');
    } else {
        issues.push('Next.js configuration missing');
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📋 FRONTEND SETTINGS TEST SUMMARY');
    console.log('='.repeat(50));
    
    if (issues.length === 0) {
        console.log('🎉 ALL FRONTEND CHECKS PASSED!');
        console.log('\n✅ Your frontend settings configuration is complete.');
        console.log('\n🚀 Ready to start:');
        console.log('   1. cd lc-workflow-frontend');
        console.log('   2. npm install (if not done)');
        console.log('   3. npm run dev');
        console.log('   4. Open http://localhost:3000/settings');
        
        console.log('\n📱 Features available:');
        console.log('   - Settings management UI');
        console.log('   - Real-time API integration');
        console.log('   - Role-based access control');
        console.log('   - Bulk settings updates');
        console.log('   - Error handling & notifications');
        
    } else {
        console.log(`⚠️  Found ${issues.length} issues:`);
        issues.forEach((issue, index) => {
            console.log(`   ${index + 1}. ${issue}`);
        });
        
        console.log('\n🔧 Recommended actions:');
        if (issues.some(i => i.includes('Missing file'))) {
            console.log('   - Ensure all required files are present');
        }
        if (issues.some(i => i.includes('environment'))) {
            console.log('   - Check .env configuration');
        }
        if (issues.some(i => i.includes('dependency'))) {
            console.log('   - Run npm install to install dependencies');
        }
    }
    
    return issues.length === 0;
}

// Run the test
if (require.main === module) {
    const success = testFrontendSettings();
    process.exit(success ? 0 : 1);
}

module.exports = { testFrontendSettings };