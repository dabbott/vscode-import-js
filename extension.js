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
  try {
    json = JSON.parse(data)
  } catch (e) {
    console.log('Failed to parse json', data.slice(0, 80))
    return
  }

  console.log('Message', json);

  const {messages, fileContent, unresolvedImports, error, goto} = json

  if ('error' in json) {
    console.log('Error executing importjs', error);
    return;
  }

  if ('messages' in json && messages.length) {
    vscode.window.showInformationMessage(messages.join('\n'));
  }

  // if ('unresolvedImports' in json) {
  //   // TODO prompt user
  //   return;
  // }

  if ('goto' in json) {
    console.log('opening', goto);
    vscode.workspace.openTextDocument(goto).then(document => {
      vscode.window.showTextDocument(document);
    })
    return;
  }

  if ('fileContent' in json) {
    syncFileContents(fileContent)
  }
}

function run(edit, args = {}) {
  const {cmd} = args
  const payload = {
    "command": cmd,
    "pathToFile": currentFilePath(),
    "fileContent": currentFileContents(),
  }

  if (cmd === 'word' || cmd === 'goto') {
    payload["commandArg"] = currentWord()
  }

  console.log('payload', payload)

  daemon.stdin.write(JSON.stringify(payload) + '\n')


  // // process = self.start_or_get_daemon()
  // // process.stdin.write((json.dumps(payload) + '\n').encode('utf-8'))
  // // process.stdin.flush()
  // resultJson = process.stdout.readline().decode('utf-8')
  // print(resultJson)

  // result = json.loads(resultJson)

  // if(result.get('error')):
  //     sublime.error_message(
  //         'Error when executing importjs:\n\n' + result.get('error'))
  //     return

  // if(result.get('messages')):
  //     sublime.status_message('\n'.join(result.get('messages')))
  // if(result.get('unresolvedImports')):
  //     def handle_resolved_imports(resolved_imports):
  //         args['command'] = 'add'
  //         args['imports'] = resolved_imports
  //         self.run(edit, **args)
  //     self.view.run_command("import_js_replace",
  //                           {"characters": result.get('fileContent')})
  //     self.ask_to_resolve(result.get('unresolvedImports'),
  //                         handle_resolved_imports)
  //     return

  // if(cmd == 'goto'):
  //     self.view.window().open_file(result.get('goto'))
  // else:
  //     self.view.run_command("import_js_replace",
  //                           {"characters": result.get('fileContent')})
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    context.subscriptions.push(
      vscode.commands.registerCommand('importjs.word', () => {
        run(null, {cmd: 'word'})
      })
    )

    context.subscriptions.push(
      vscode.commands.registerCommand('importjs.goto', () => {
        run(null, {cmd: 'goto'})
      })
    )

    context.subscriptions.push(
      vscode.commands.registerCommand('importjs.fix', () => {
        run(null, {cmd: 'fix'})
      })
    )

    daemon = spawn('importjs', ['start', `--parent-pid=${process.pid}`], {
      cwd: projectDirectoryPath(),
    });

    daemon.stdout.on('data', handleMessage)

    daemon.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
    });

    daemon.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
    });

    console.log('File path:', currentFilePath(), projectDirectoryPath())
}

exports.activate = activate;

function deactivate() {
    if (daemon) {
        daemon.kill()
    }
}

exports.deactivate = deactivate;