#!/usr/bin/env node

/**
 * Post-processing script to fix doubled asset paths in web exports
 * This fixes the issue where assets are exported to dist/assets/assets/ instead of dist/assets/
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist');
const assetsDir = path.join(distDir, 'assets');
const doubledAssetsDir = path.join(assetsDir, 'assets');

console.log('🔧 Fixing doubled asset paths in web export...');

// Check if the doubled assets directory exists
if (!fs.existsSync(doubledAssetsDir)) {
  console.log('✅ No doubled assets directory found, skipping fix.');
  process.exit(0);
}

console.log(`📁 Found doubled assets at: ${doubledAssetsDir}`);

// Recursively move all files and directories
const moveAssets = (src, dest) => {
  if (!fs.existsSync(src)) return;
  
  const items = fs.readdirSync(src);
  
  items.forEach(item => {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stat = fs.lstatSync(srcPath);
    
    if (stat.isDirectory()) {
      // Create destination directory if it doesn't exist
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      // Recursively move contents
      moveAssets(srcPath, destPath);
    } else {
      // Copy file
      fs.copyFileSync(srcPath, destPath);
      console.log(`  ✓ Moved: ${path.relative(assetsDir, destPath)}`);
    }
  });
};

console.log('📋 Moving assets from dist/assets/assets/ to dist/assets/...');
moveAssets(doubledAssetsDir, assetsDir);

// Remove the now-empty doubled assets directory
const removeEmptyDirs = (dir) => {
  try {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      if (fs.lstatSync(fullPath).isDirectory()) {
        removeEmptyDirs(fullPath);
      }
    });
    
    // Remove directory if empty
    const remaining = fs.readdirSync(dir);
    if (remaining.length === 0 && dir !== assetsDir) {
      fs.rmdirSync(dir);
      console.log(`  ✓ Removed empty directory: ${dir}`);
    }
  } catch (e) {
    // Directory might already be removed
  }
};

removeEmptyDirs(doubledAssetsDir);

// Fix JavaScript bundle references
console.log('📝 Fixing asset references in JavaScript bundle...');

const jsFiles = [];
const collectJsFiles = (dir) => {
  try {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      try {
        if (fs.lstatSync(fullPath).isDirectory()) {
          collectJsFiles(fullPath);
        } else if (item.endsWith('.js')) {
          jsFiles.push(fullPath);
        }
      } catch (e) {
        // Skip unreadable items
      }
    });
  } catch (e) {
    // Skip unreadable directories
  }
};

collectJsFiles(distDir);

jsFiles.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;
    
    // Replace /assets/assets/ with /assets/
    content = content.replace(/\/assets\/assets\//g, '/assets/');
    
    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`  ✓ Fixed: ${path.relative(distDir, file)}`);
    }
  } catch (e) {
    console.error(`  ✗ Error processing ${file}: ${e.message}`);
  }
});

// Fix HTML file references
console.log('📄 Fixing asset references in HTML files...');

const htmlFiles = [];
const collectHtmlFiles = (dir) => {
  try {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      try {
        if (fs.lstatSync(fullPath).isDirectory()) {
          collectHtmlFiles(fullPath);
        } else if (item.endsWith('.html')) {
          htmlFiles.push(fullPath);
        }
      } catch (e) {
        // Skip unreadable items
      }
    });
  } catch (e) {
    // Skip unreadable directories
  }
};

collectHtmlFiles(distDir);

htmlFiles.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    const originalContent = content;
    
    // Replace /assets/assets/ with /assets/
    content = content.replace(/\/assets\/assets\//g, '/assets/');
    
    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`  ✓ Fixed: ${path.relative(distDir, file)}`);
    }
  } catch (e) {
    console.error(`  ✗ Error processing ${file}: ${e.message}`);
  }
});

console.log('✨ Asset path fixing complete!');

