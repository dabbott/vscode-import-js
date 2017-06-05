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

function replaceFileContentsViaDiff(newText) {
  const currentText = currentFileContents();

  if (currentText === newText) return;

  const textEdits = textEditsForDiff(currentText, newText);
  console.log('TextEdits', textEdits);

  const workspaceEdit = new WorkspaceEdit();
  workspaceEdit.set(currentDocument().uri, textEdits);

  vscode.workspace.applyEdit(workspaceEdit);
}

function replaceFileContents(text) {
  const uri = currentDocument().uri;

  const documentStart = new Position(0, 0);
  const documentEnd = new Position(1, 0);
  const range = new Range(documentStart, documentEnd);

  const workspaceEdit = new WorkspaceEdit();
  workspaceEdit.replace(uri, range, 'Hello\n\n');

  vscode.workspace.applyEdit(workspaceEdit);

  // const lines = currentFileContents().split('\n');

  // const documentStart = new Position(0, 0);
  // const documentEnd = new Position(lines.length - 1, lines[lines.length - 1].length);
  // const range = new Range(documentStart, documentEnd);

  // const workspaceEdit = new WorkspaceEdit();
  // // const textEdit = new TextEdit(range, text);
  // // workspaceEdit.set(uri, [textEdit]);
  // workspaceEdit.replace(uri, range, text);

  // vscode.workspace.applyEdit(workspaceEdit);
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

// function importWord(word, currentFilePath) {
//     // if (daemon) {
//     //     daemon.stdin.write('word currentFilePath /Users/devin_abbott/Projects/vscode-import-js/extension.js\n')
//     // }
//     // let child = spawn('importjs', ['word', 'currentFilePath', '/Users/devin_abbott/Projects/vscode-import-js/extension.js'])
//     let child = spawn('importjs', ['word', 'currentFilePath', './extension.js'], {
//         cwd: '/Users/devin_abbott/Projects/vscode-import-js',
//     })

//     child.on('close', (code, signal) => {
//         console.log('exit with', code, signal)
//     })

//     child.on('error', (err) => {
//         console.log('err', err)
//     })

//     child.stdout.on('data', (data) => {
//         console.log('data', data.toString())
//     })
//     child.stderr.on('data', (data) => {
//         console.log('data', data.toString())
//     })

//     console.log('started child')
// }

function handleMessage(data) {
  let json
  try {
    json = JSON.parse(data)
  } catch (e) {
    console.log('Failed to parse json', data.slice(0, 80))
    return
  }

  const {messages, fileContent, unresolvedImports} = json

  console.log('Message', json)

  if (typeof fileContent === 'string') {
    // replaceFileContents(fileContent)
    replaceFileContentsViaDiff(fileContent)
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

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-import-js" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    var disposable = vscode.commands.registerCommand('importjs.word', function () {
        // The code you place here will be executed every time your command is executed

        run(null, {cmd: 'word'})

        // Display a message box to the user
        vscode.window.showInformationMessage('Imported?');
    });

    // vscode.window.onDidChangeTextEditorSelection(() => {
    //   console.log('selection changed', currentWord())
    // })

    // withModuleFinder(vscode, () => {
    //     console.log('Done!')
    // })

    // exec(`importjs start --parent-pid=${process.pid}`, (error, stdout, stderr) => {
    //     if (error) {
    //         console.error(`exec error: ${error}`);
    //         return;
    //     }
    //     console.log(`stdout: ${stdout}`);
    //     console.log(`stderr: ${stderr}`);
    // });

    daemon = spawn('importjs', ['start', `--parent-pid=${process.pid}`], {
      cwd: projectDirectoryPath(),
      // env: {},
    });

    daemon.stdout.on('data', handleMessage)

    daemon.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
    });

    daemon.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
    });

    // console.log('ctx', context)

    // setTimeout(() => {
    //     console.log('Running it!')
        // importWord()
    // }, 1000)

    // vscode.workspace.onDidOpenTextDocument
    // console.log('Root', currentFilePath())

    context.subscriptions.push(disposable);

    console.log('File path:', currentFilePath(), projectDirectoryPath())
}

exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
    if (daemon) {
        daemon.kill()
    }
}

exports.deactivate = deactivate;