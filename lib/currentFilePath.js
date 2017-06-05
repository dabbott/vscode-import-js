const vscode = require('vscode');

/**
 * @return String
 */
function currentFilePath() {
  return vscode.window.activeTextEditor.document.fileName;
}

module.exports = currentFilePath;
