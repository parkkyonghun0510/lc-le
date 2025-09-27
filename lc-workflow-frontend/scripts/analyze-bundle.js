#!/usr/bin/env node

/**
 * Bundle Analysis Script
 * Analyzes bundle size and provides optimization recommendations
 */

const fs = require('fs');
const path = require('path');

// Bundle size thresholds
const THRESHOLDS = {
  JS: {
    warning: 250000, // 250KB
    error: 500000,   // 500KB
  },
  CSS: {
    warning: 50000,  // 50KB
    error: 100000,   // 100KB
  },
  TOTAL: {
    warning: 1000000, // 1MB
    error: 2000000,   // 2MB
  }
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeBundle() {
  const buildDir = path.join(__dirname, '..', '.next', 'static', 'chunks');
  
  if (!fs.existsSync(buildDir)) {
    console.log('❌ Build directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  console.log('📊 Analyzing bundle size...\n');

  const files = fs.readdirSync(buildDir);
  const jsFiles = files.filter(file => file.endsWith('.js'));
  const cssFiles = files.filter(file => file.endsWith('.css'));

  let totalJSSize = 0;
  let totalCSSSize = 0;
  const largeFiles = [];

  console.log('📦 JavaScript Files:');
  console.log('─'.repeat(60));
  
  jsFiles.forEach(file => {
    const filePath = path.join(buildDir, file);
    const stats = fs.statSync(filePath);
    const size = stats.size;
    totalJSSize += size;

    const status = size > THRESHOLDS.JS.error ? '🔴' : 
                   size > THRESHOLDS.JS.warning ? '🟡' : '🟢';

    console.log(`${status} ${file.padEnd(30)} ${formatBytes(size).padStart(10)}`);

    if (size > THRESHOLDS.JS.warning) {
      largeFiles.push({ name: file, size, type: 'JS' });
    }
  });

  console.log('\n🎨 CSS Files:');
  console.log('─'.repeat(60));
  
  cssFiles.forEach(file => {
    const filePath = path.join(buildDir, file);
    const stats = fs.statSync(filePath);
    const size = stats.size;
    totalCSSSize += size;

    const status = size > THRESHOLDS.CSS.error ? '🔴' : 
                   size > THRESHOLDS.CSS.warning ? '🟡' : '🟢';

    console.log(`${status} ${file.padEnd(30)} ${formatBytes(size).padStart(10)}`);

    if (size > THRESHOLDS.CSS.warning) {
      largeFiles.push({ name: file, size, type: 'CSS' });
    }
  });

  const totalSize = totalJSSize + totalCSSSize;

  console.log('\n📈 Summary:');
  console.log('─'.repeat(60));
  console.log(`Total JS Size:  ${formatBytes(totalJSSize)}`);
  console.log(`Total CSS Size: ${formatBytes(totalCSSSize)}`);
  console.log(`Total Size:     ${formatBytes(totalSize)}`);

  // Performance assessment
  console.log('\n🎯 Performance Assessment:');
  console.log('─'.repeat(60));

  const jsStatus = totalJSSize > THRESHOLDS.JS.error ? '🔴 Poor' : 
                   totalJSSize > THRESHOLDS.JS.warning ? '🟡 Warning' : '🟢 Good';
  const cssStatus = totalCSSSize > THRESHOLDS.CSS.error ? '🔴 Poor' : 
                    totalCSSSize > THRESHOLDS.CSS.warning ? '🟡 Warning' : '🟢 Good';
  const totalStatus = totalSize > THRESHOLDS.TOTAL.error ? '🔴 Poor' : 
                      totalSize > THRESHOLDS.TOTAL.warning ? '🟡 Warning' : '🟢 Good';

  console.log(`JavaScript: ${jsStatus}`);
  console.log(`CSS:        ${cssStatus}`);
  console.log(`Overall:    ${totalStatus}`);

  // Recommendations
  if (largeFiles.length > 0 || totalSize > THRESHOLDS.TOTAL.warning) {
    console.log('\n💡 Optimization Recommendations:');
    console.log('─'.repeat(60));

    if (totalJSSize > THRESHOLDS.JS.warning) {
      console.log('• Consider code splitting for large JavaScript bundles');
      console.log('• Use dynamic imports for heavy components');
      console.log('• Implement lazy loading for non-critical features');
    }

    if (totalCSSSize > THRESHOLDS.CSS.warning) {
      console.log('• Optimize CSS by removing unused styles');
      console.log('• Consider CSS-in-JS for component-specific styles');
      console.log('• Use CSS purging to remove dead code');
    }

    if (largeFiles.length > 0) {
      console.log('\n🔍 Large Files to Investigate:');
      largeFiles.forEach(file => {
        console.log(`• ${file.name} (${formatBytes(file.size)}) - ${file.type}`);
      });
    }

    console.log('\n🛠️  Specific Actions:');
    console.log('• Run "npm run build" with --analyze flag for detailed analysis');
    console.log('• Use webpack-bundle-analyzer to visualize bundle composition');
    console.log('• Consider implementing route-based code splitting');
    console.log('• Review and optimize third-party library usage');
  } else {
    console.log('\n✅ Bundle size is within acceptable limits!');
  }

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalJSSize,
      totalCSSSize,
      totalSize,
      jsStatus: totalJSSize > THRESHOLDS.JS.error ? 'poor' : 
                totalJSSize > THRESHOLDS.JS.warning ? 'warning' : 'good',
      cssStatus: totalCSSSize > THRESHOLDS.CSS.error ? 'poor' : 
                 totalCSSSize > THRESHOLDS.CSS.warning ? 'warning' : 'good',
      overallStatus: totalSize > THRESHOLDS.TOTAL.error ? 'poor' : 
                     totalSize > THRESHOLDS.TOTAL.warning ? 'warning' : 'good',
    },
    largeFiles,
    recommendations: generateRecommendations(totalJSSize, totalCSSSize, totalSize)
  };

  const reportPath = path.join(__dirname, '..', 'bundle-analysis-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
}

function generateRecommendations(jsSize, cssSize, totalSize) {
  const recommendations = [];

  if (jsSize > THRESHOLDS.JS.warning) {
    recommendations.push({
      type: 'javascript',
      priority: jsSize > THRESHOLDS.JS.error ? 'high' : 'medium',
      message: 'JavaScript bundle is large. Consider code splitting and lazy loading.',
      actions: [
        'Implement dynamic imports for heavy components',
        'Use route-based code splitting',
        'Review and optimize third-party library usage',
        'Consider tree shaking for unused code'
      ]
    });
  }

  if (cssSize > THRESHOLDS.CSS.warning) {
    recommendations.push({
      type: 'css',
      priority: cssSize > THRESHOLDS.CSS.error ? 'high' : 'medium',
      message: 'CSS bundle is large. Consider optimization strategies.',
      actions: [
        'Remove unused CSS with PurgeCSS',
        'Use CSS-in-JS for component-specific styles',
        'Optimize CSS delivery with critical CSS',
        'Consider CSS modules for better tree shaking'
      ]
    });
  }

  if (totalSize > THRESHOLDS.TOTAL.warning) {
    recommendations.push({
      type: 'overall',
      priority: totalSize > THRESHOLDS.TOTAL.error ? 'high' : 'medium',
      message: 'Overall bundle size is large. Implement comprehensive optimization.',
      actions: [
        'Enable gzip/brotli compression',
        'Implement service worker for caching',
        'Use CDN for static assets',
        'Consider micro-frontend architecture'
      ]
    });
  }

  return recommendations;
}

// Run analysis
analyzeBundle();
