// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require('vscode');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;

// const currentFilePath = require('./lib/currentFilePath');
const withModuleFinder = require('./lib/withModuleFinder');

let daemon = null;

function currentFilePath() {
  return vscode.window.activeTextEditor.document.fileName;
}

function currentFileContents() {
  return vscode.window.activeTextEditor.document.getText()
}

// https://github.com/codemirror/CodeMirror/blob/master/mode/javascript/javascript.js#L25
const wordRE = /[\w$\xa1-\uffff]+/

function currentWord() {
  const position = vscode.window.activeTextEditor.selection.active
  const range = vscode.window.activeTextEditor.document.getWordRangeAtPosition(position, wordRE)

  if (!range) { return null }

  return vscode.window.activeTextEditor.document.getText(range)
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

    daemon.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

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