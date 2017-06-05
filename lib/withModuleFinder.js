const vscode = require('vscode');

// const { findProjectRoot, initializeModuleFinder } = require('import-js');

const currentFilePath = require('./currentFilePath');

function withModuleFinder(done) {
  initializeModuleFinder(findProjectRoot(currentFilePath(vscode))).then(done).catch((err) => {
    console.error(err); // eslint-disable-line no-console
    done();
  });
}

module.exports = withModuleFinder;