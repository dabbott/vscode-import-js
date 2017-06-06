// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const {Position, Range, TextEdit, WorkspaceEdit} = vscode;

const spawn = require('child_process').spawn;
const exec = require('child_process').exec;

const textEditsForDiff = require('./lib/textEditsForDiff');

let daemon = null;

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

function syncFileContents(newText) {
  const currentText = currentFileContents();

  if (currentText === newText) return;

  const textEdits = textEditsForDiff(currentText, newText);
  console.log('TextEdits', textEdits);

  const workspaceEdit = new WorkspaceEdit();
  workspaceEdit.set(currentDocument().uri, textEdits);

  vscode.workspace.applyEdit(workspaceEdit);
}

// https://github.com/codemirror/CodeMirror/blob/master/mode/javascript/javascript.js#L25
const wordRE = /[\w$\xa1-\uffff]+/

function currentWord() {
  const position = activeEditor().selection.active
  const range = currentDocument().getWordRangeAtPosition(position, wordRE)

  if (!range) { return null }

  return currentDocument().getText(range)
}

function projectDirectoryPath() {
  return vscode.workspace.rootPath;
}

function handleMessage(data) {
  let json

  // The first message we get is not json and will be ignored
  try {
    json = JSON.parse(data)
  } catch (e) {
    return
  }

  console.log('Message', json);

  const {messages, fileContent, unresolvedImports, error, goto} = json

  if ('error' in json) {
    console.log('Error executing importjs', error);
    return;
  }

  if ('messages' in json && messages.length) {
    vscode.window.setStatusBarMessage(messages.join('\n'), 3000);
  }

  if ('goto' in json) {
    console.log('opening', goto);
    vscode.workspace.openTextDocument(goto).then(document => {
      vscode.window.showTextDocument(document);
    })
    return;
  }

  // Always sync resolved imports, even if there are some remaining to resolve
  if ('fileContent' in json) {
    syncFileContents(fileContent)
  }

  if ('unresolvedImports' in json && Object.keys(unresolvedImports).length > 0) {
    // unresolvedImports.test = [
    //   {displayName: 'test1', filePath: 't1'},
    //   {displayName: 'test2', filePath: 't2'},
    // ]

    const questions = Object.keys(unresolvedImports).map(name => {
      const matches = unresolvedImports[name];
      const options = matches.map(({displayName, importPath, filePath}) => {
        return {label: displayName, description: filePath, importPath};
      })

      return {name, options}
    })

    const getAnswers = (remaining, results = []) => {
      if (remaining.length === 0) {
        return Promise.resolve(results);
      }

      const {name, options} = remaining[0];

      return vscode.window.showQuickPick(options, {placeHolder: `Import ${name} from`}).then(selected => {
        // If user cancels, still import the modules they've resolved so far
        if (!selected) {
          return Promise.resolve(results)
        }

        const answer = {name, path: selected.importPath};

        return getAnswers(remaining.slice(1), results.concat(answer));
      })
    }

    getAnswers(questions).then(answers => {
      console.log('Answers!', answers);

      const imports = answers.reduce((imports, answer) => {
        const {name, path} = answer

        imports[name] = path

        return imports
      }, {})

      run('add', imports)
    })
  }
}

function run(command, commandArg) {
  const payload = {
    command: command,
    commandArg: commandArg,
    pathToFile: currentFilePath(),
    fileContent: currentFileContents(),
  }

  daemon.stdin.write(JSON.stringify(payload) + '\n')
}

function startDaemon() {
  daemon = spawn('importjs', ['start', `--parent-pid=${process.pid}`], {
    cwd: projectDirectoryPath(),
  });

  daemon.stdout.on('data', handleMessage)
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
  const subscriptions = [
    vscode.commands.registerCommand('importjs.word', () => run('word', currentWord())),
    vscode.commands.registerCommand('importjs.goto', () => run('goto', currentWord())),
    vscode.commands.registerCommand('importjs.fix', () => run('fix')),
  ]

  subscriptions.forEach(sub => context.subscriptions.push(sub))

  startDaemon()
}

function deactivate() {
  if (daemon) {
    daemon.kill()
  }
}

exports.activate = activate;
exports.deactivate = deactivate;