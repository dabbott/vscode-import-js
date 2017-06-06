const vscode = require("vscode");
const { WorkspaceEdit } = vscode;

const textEditsForDiff = require("./textEditsForDiff");

function activeEditor() {
  return vscode.window.activeTextEditor;
}

function currentDocument() {
  return activeEditor().document;
}

function currentFilePath() {
  return currentDocument().fileName;
}

function currentFileContents() {
  return currentDocument().getText();
}

function projectDirectoryPath() {
  return vscode.workspace.rootPath;
}

function applyEdit(edit) {
  const workspaceEdit = new WorkspaceEdit();
  workspaceEdit.set(currentDocument().uri, [edit]);
  vscode.workspace.applyEdit(workspaceEdit);
}

function syncFileContents(newText) {
  const currentText = currentFileContents();

  if (currentText === newText) return;

  const textEdits = textEditsForDiff(currentText, newText);
  textEdits.forEach(applyEdit);
}

// Detect word boundaries in JavaScript
// https://github.com/codemirror/CodeMirror/blob/master/mode/javascript/javascript.js#L25
const wordRE = /[\w$\xa1-\uffff]+/;

function currentWord() {
  const position = activeEditor().selection.active;
  const range = currentDocument().getWordRangeAtPosition(position, wordRE);

  return range ? currentDocument().getText(range) : null;
}

exports.activeEditor = activeEditor;
exports.currentDocument = currentDocument;
exports.currentFilePath = currentFilePath;
exports.currentFileContents = currentFileContents;
exports.applyEdit = applyEdit;
exports.syncFileContents = syncFileContents;
exports.currentWord = currentWord;
exports.projectDirectoryPath = projectDirectoryPath;
