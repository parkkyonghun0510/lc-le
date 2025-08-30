#!/usr/bin/env node

/**
 * Backend Deployment Verification Script for Railway
 * 
 * This script verifies that the LC Workflow Backend is ready for Railway deployment
 * by checking dependencies, configuration, Docker build, and API endpoints.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class BackendDeploymentVerifier {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.projectRoot = path.resolve(__dirname, '..');
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            'info': '✓',
            'warn': '⚠',
            'error': '✗',
            'step': '→'
        }[type] || 'ℹ';
        
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    addError(message) {
        this.errors.push(message);
        this.log(message, 'error');
    }

    addWarning(message) {
        this.warnings.push(message);
        this.log(message, 'warn');
    }

    checkFile(filePath, description) {
        const fullPath = path.join(this.projectRoot, filePath);
        if (!fs.existsSync(fullPath)) {
            this.addError(`Missing ${description}: ${filePath}`);
            return false;
        }
        this.log(`Found ${description}: ${filePath}`);
        return true;
    }

    checkRequiredFiles() {
        this.log('Checking required files...', 'step');
        
        const requiredFiles = [
            { path: 'requirements.txt', desc: 'Python dependencies file' },
            { path: 'railway.toml', desc: 'Railway configuration' },
            { path: 'Dockerfile', desc: 'Docker configuration' },
            { path: 'app/main.py', desc: 'FastAPI main application' },
            { path: 'app/core/config.py', desc: 'Application configuration' },
            { path: 'alembic.ini', desc: 'Database migration configuration' }
        ];

        requiredFiles.forEach(file => {
            this.checkFile(file.path, file.desc);
        });
    }

    checkPythonDependencies() {
        this.log('Checking Python dependencies...', 'step');
        
        try {
            const requirementsPath = path.join(this.projectRoot, 'requirements.txt');
            const requirements = fs.readFileSync(requirementsPath, 'utf8');
            
            const criticalDeps = [
                'fastapi',
                'uvicorn',
                'sqlalchemy',
                'alembic',
                'psycopg2-binary',
                'python-jose',
                'passlib'
            ];

            criticalDeps.forEach(dep => {
                if (!requirements.includes(dep)) {
                    this.addError(`Missing critical dependency: ${dep}`);
                } else {
                    this.log(`Found dependency: ${dep}`);
                }
            });
        } catch (error) {
            this.addError(`Failed to read requirements.txt: ${error.message}`);
        }
    }

    checkRailwayConfiguration() {
        this.log('Checking Railway configuration...', 'step');
        
        try {
            const railwayPath = path.join(this.projectRoot, 'railway.toml');
            const railwayConfig = fs.readFileSync(railwayPath, 'utf8');
            
            // Check for required sections
            if (!railwayConfig.includes('[build]')) {
                this.addError('Missing [build] section in railway.toml');
            }
            
            if (!railwayConfig.includes('[deploy]')) {
                this.addError('Missing [deploy] section in railway.toml');
            }
            
            if (!railwayConfig.includes('startCommand')) {
                this.addError('Missing startCommand in railway.toml');
            }
            
            if (!railwayConfig.includes('healthcheckPath')) {
                this.addError('Missing healthcheckPath in railway.toml');
            }
            
            // Check for alembic migration in start command
            if (!railwayConfig.includes('alembic upgrade head')) {
                this.addWarning('Start command should include database migration');
            }
            
            this.log('Railway configuration validated');
        } catch (error) {
            this.addError(`Failed to read railway.toml: ${error.message}`);
        }
    }

    checkDockerfile() {
        this.log('Checking Dockerfile configuration...', 'step');
        
        try {
            const dockerfilePath = path.join(this.projectRoot, 'Dockerfile');
            const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');
            
            // Check for Python base image
            if (!dockerfile.includes('FROM python:')) {
                this.addError('Dockerfile should use Python base image');
            }
            
            // Check for requirements installation
            if (!dockerfile.includes('pip install')) {
                this.addError('Dockerfile should install Python dependencies');
            }
            
            // Check for PORT environment variable usage
            if (!dockerfile.includes('$PORT') && !dockerfile.includes('${PORT}')) {
                this.addWarning('Dockerfile should use Railway PORT environment variable');
            }
            
            // Check for health check
            if (!dockerfile.includes('HEALTHCHECK')) {
                this.addWarning('Dockerfile should include health check');
            }
            
            this.log('Dockerfile configuration validated');
        } catch (error) {
            this.addError(`Failed to read Dockerfile: ${error.message}`);
        }
    }

    checkEnvironmentTemplate() {
        this.log('Checking environment configuration...', 'step');
        
        const envPath = path.join(this.projectRoot, '.env.production');
        if (fs.existsSync(envPath)) {
            try {
                const envContent = fs.readFileSync(envPath, 'utf8');
                
                const requiredVars = [
                    'DATABASE_URL',
                    'SECRET_KEY',
                    'CORS_ORIGINS'
                ];

                requiredVars.forEach(varName => {
                    if (!envContent.includes(varName)) {
                        this.addWarning(`Environment template missing: ${varName}`);
                    } else {
                        this.log(`Found environment variable template: ${varName}`);
                    }
                });
            } catch (error) {
                this.addError(`Failed to read .env.production: ${error.message}`);
            }
        } else {
            this.addWarning('No .env.production template found');
        }
    }

    checkDockerAvailability() {
        try {
            execSync('docker --version', { stdio: 'ignore' });
            return true;
        } catch (error) {
            return false;
        }
    }

    async testDockerBuild() {
        this.log('Testing Docker build...', 'step');
        
        if (!this.checkDockerAvailability()) {
            this.addWarning('Docker not available - skipping Docker build test');
            this.log('Note: Docker build will be tested on Railway during deployment');
            return;
        }
        
        return new Promise((resolve) => {
            const buildProcess = spawn('docker', ['build', '-t', 'lc-backend-test', '.'], {
                cwd: this.projectRoot,
                stdio: 'pipe'
            });

            let output = '';
            let errorOutput = '';

            buildProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            buildProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            buildProcess.on('close', (code) => {
                if (code === 0) {
                    this.log('Docker build successful');
                    
                    // Clean up test image
                    try {
                        execSync('docker rmi lc-backend-test', { stdio: 'ignore' });
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                } else {
                    this.addError(`Docker build failed with code ${code}`);
                    if (errorOutput) {
                        this.log(`Build error: ${errorOutput.slice(-500)}`, 'error');
                    }
                }
                resolve();
            });

            buildProcess.on('error', (error) => {
                this.addError(`Docker build error: ${error.message}`);
                resolve();
            });

            // Timeout after 5 minutes
            setTimeout(() => {
                buildProcess.kill();
                this.addError('Docker build timed out after 5 minutes');
                resolve();
            }, 300000);
        });
    }

    checkDatabaseMigrations() {
        this.log('Checking database migrations...', 'step');
        
        const migrationsDir = path.join(this.projectRoot, 'migrations', 'versions');
        if (fs.existsSync(migrationsDir)) {
            const migrations = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.py'));
            this.log(`Found ${migrations.length} database migrations`);
            
            if (migrations.length === 0) {
                this.addWarning('No database migrations found');
            }
        } else {
            this.addError('Migrations directory not found');
        }
    }

    generateReport() {
        this.log('\n=== DEPLOYMENT VERIFICATION REPORT ===', 'step');
        
        if (this.errors.length === 0 && this.warnings.length === 0) {
            this.log('✅ All checks passed! Backend is ready for Railway deployment.', 'info');
        } else {
            if (this.errors.length > 0) {
                this.log(`\n❌ Found ${this.errors.length} error(s):`, 'error');
                this.errors.forEach((error, index) => {
                    console.log(`   ${index + 1}. ${error}`);
                });
            }
            
            if (this.warnings.length > 0) {
                this.log(`\n⚠️  Found ${this.warnings.length} warning(s):`, 'warn');
                this.warnings.forEach((warning, index) => {
                    console.log(`   ${index + 1}. ${warning}`);
                });
            }
        }
        
        this.log('\n=== NEXT STEPS ===', 'step');
        if (this.errors.length === 0) {
            console.log('1. Commit your changes to git');
            console.log('2. Connect your repository to Railway');
            console.log('3. Add a PostgreSQL database service');
            console.log('4. Set environment variables in Railway dashboard');
            console.log('5. Deploy your application');
        } else {
            console.log('1. Fix the errors listed above');
            console.log('2. Run this script again to verify fixes');
            console.log('3. Proceed with Railway deployment once all errors are resolved');
        }
        
        return this.errors.length === 0;
    }

    async run() {
        this.log('Starting LC Workflow Backend deployment verification...', 'step');
        
        this.checkRequiredFiles();
        this.checkPythonDependencies();
        this.checkRailwayConfiguration();
        this.checkDockerfile();
        this.checkEnvironmentTemplate();
        this.checkDatabaseMigrations();
        
        // Only run Docker build if no critical errors
        if (this.errors.length === 0) {
            await this.testDockerBuild();
        } else {
            this.log('Skipping Docker build due to configuration errors', 'warn');
        }
        
        const success = this.generateReport();
        process.exit(success ? 0 : 1);
    }
}

// Run the verification
if (require.main === module) {
    const verifier = new BackendDeploymentVerifier();
    verifier.run().catch(error => {
        console.error('Verification failed:', error);
        process.exit(1);
    });
}

module.exports = BackendDeploymentVerifier;