const fs = require('fs');
const path = require('path');
const CleanCSS = require('clean-css');
const UglifyJS = require('uglify-js');

const distPath = path.join(__dirname, '/../dist');
const srcPath = path.join(__dirname, '/../src');

async function minifyCss(sourcePath) {
  const CleanCss = new CleanCSS({
      level: {
          2: {
              // Controls semantic merging.
              mergeSemantically: true,
          }
      },
      returnPromise: true
  });
  return await CleanCss.minify([sourcePath]).then(output => {
      return output.styles;
  });
}

async function compressCssFile(name, customReplace) {
  const sourcePath = path.join(srcPath, `css/${name}.css`);
  const minifiedCss = await minifyCss(sourcePath);
  const destPath = path.join(
      distPath,
      `css/${name}.min.css`
  );
  let destCss = minifiedCss;
  if (customReplace) {
      for (const [pattern, replacement] of customReplace) {
          destCss = destCss.replaceAll(pattern, replacement);
      }
  }
  return fs.promises.writeFile(destPath, destCss);
}

async function minifyJs(sourcePath) {
  const sourceCode = await fs.promises.readFile(sourcePath, 'utf8');
  return UglifyJS.minify(sourceCode, {
      compress: {
          drop_console: false,
          pure_funcs: [
              // Exclude "console.log" statements.
              "console.log",
          ]
      },
      mangle: true,
      output: {
          // Preserve compulsory comments (eg. version name).
          comments: '/^!/',
      }
  }).code;
}

async function compressJsFile(name, customReplace) {
  const sourcePath = path.join(srcPath, `scripts/${name}.js`);
  const minifiedJs = await minifyJs(sourcePath);
  const destPath = path.join(
      distPath,
      `scripts/${name}.min.js`
  );
  let destJs = minifiedJs;
  if (customReplace) {
    for (const [pattern, replacement] of customReplace) {
      destJs = destJs.replaceAll(pattern, replacement);
    }
  }
  return fs.promises.writeFile(destPath, destJs);
}

function makeDirIfNotExists(dirname) {
  if (!fs.existsSync(dirname)) {
      fs.mkdirSync(dirname, {recursive: true});
  }
}

makeDirIfNotExists(path.join(distPath, 'css'));
makeDirIfNotExists(path.join(distPath, 'scripts'));

const customJsReplace = [
  ['/breadcrumbs.js', '/breadcrumbs.min.js'],
  ['/progress.js', '/progress.min.js'],
];

Promise.all([
  // CSS
  compressCssFile('droplet'),
  compressCssFile('customization'),
  compressCssFile('whats-new'),
  compressCssFile('menu-explorer'),
  compressCssFile('droplet-plus'),
  compressCssFile('my-theme'),
  // JS
  compressJsFile('droplet', customJsReplace),
  compressJsFile('progress', customJsReplace),
  compressJsFile('breadcrumbs', customJsReplace),
]).then(() => {
  console.log("All done.");
});
