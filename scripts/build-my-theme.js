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

function makeDirIfNotExists(dirname) {
  if (!fs.existsSync(dirname)) {
      fs.mkdirSync(dirname, {recursive: true});
  }
}

makeDirIfNotExists(path.join(distPath, 'css'));

Promise.all([
  compressCssFile('my-theme'),
]).then(() => {
  console.log("All done.");
});
