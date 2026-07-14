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
      // Delete source directory after moving contents
      try {
        fs.rmdirSync(srcPath);
      } catch (e) {
        // Directory may not be empty or may have permission issues
      }
    } else {
      // Copy file
      fs.copyFileSync(srcPath, destPath);
      // Delete original file
      try {
        fs.unlinkSync(srcPath);
      } catch (e) {
        console.error(`  ✗ Could not delete original: ${srcPath}`);
      }
      console.log(`  ✓ Moved: ${path.relative(assetsDir, destPath)}`);
    }
  });
};

console.log('📋 Moving assets from dist/assets/assets/ to dist/assets/...');
moveAssets(doubledAssetsDir, assetsDir);

// Remove the now-empty doubled assets directory and any empty parent directories
const removeEmptyDirs = (startDir, stopAt = null) => {
  const collectDirs = (dir, dirs = []) => {
    try {
      if (!fs.existsSync(dir)) return dirs;
      
      const items = fs.readdirSync(dir);
      dirs.push(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        try {
          if (fs.lstatSync(fullPath).isDirectory()) {
            collectDirs(fullPath, dirs);
          }
        } catch (e) {
          // Skip unreadable items
        }
      });
      
      return dirs;
    } catch (e) {
      return dirs;
    }
  };
  
  // Collect all directories, then process in reverse order (deepest first)
  const allDirs = collectDirs(startDir);
  allDirs.reverse(); // Start from deepest
  
  allDirs.forEach(dir => {
    try {
      if (fs.existsSync(dir) && dir !== stopAt) {
        const items = fs.readdirSync(dir);
        if (items.length === 0) {
          fs.rmdirSync(dir);
          console.log(`  ✓ Removed empty directory: ${path.relative(distDir, dir)}`);
        }
      }
    } catch (e) {
      // Skip unreadable items or already-removed directories
    }
  });
};

removeEmptyDirs(doubledAssetsDir, assetsDir);

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

// Copy public files to dist root
console.log('📂 Copying public files to dist root...');

const publicDir = path.join(__dirname, '../public');
if (fs.existsSync(publicDir)) {
  const publicFiles = fs.readdirSync(publicDir);
  
  publicFiles.forEach(file => {
    const srcPath = path.join(publicDir, file);
    const destPath = path.join(distDir, file);
    
    try {
      if (fs.lstatSync(srcPath).isFile()) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`  ✓ Copied: ${file}`);
      }
    } catch (e) {
      console.error(`  ✗ Error copying ${file}: ${e.message}`);
    }
  });
} else {
  console.log('  ℹ️  No public directory found, skipping.');
}

console.log('✨ Asset path fixing complete!');

