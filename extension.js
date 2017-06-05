// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
// var vscode = require('vscode');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;

// const currentFilePath = require('./lib/currentFilePath');
const withModuleFinder = require('./lib/withModuleFinder');

let daemon = null;

function currentFilePath() {
  return vscode.window.activeTextEditor.document.fileName;
}

function importWord(word, currentFilePath) {
    // if (daemon) {
    //     daemon.stdin.write('word currentFilePath /Users/devin_abbott/Projects/vscode-import-js/extension.js\n')
    // }
    // let child = spawn('importjs', ['word', 'currentFilePath', '/Users/devin_abbott/Projects/vscode-import-js/extension.js'])
    let child = spawn('importjs', ['word', 'currentFilePath', './extension.js'], {
        cwd: '/Users/devin_abbott/Projects/vscode-import-js',
    })

    child.on('close', (code, signal) => {
        console.log('exit with', code, signal)
    })

    child.on('error', (err) => {
        console.log('err', err)
    })

    child.stdout.on('data', (data) => {
        console.log('data', data.toString())
    })
    child.stderr.on('data', (data) => {
        console.log('data', data.toString())
    })

    console.log('started child')
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
    var disposable = vscode.commands.registerCommand('extension.sayHello', function () {
        // The code you place here will be executed every time your command is executed

        // Display a message box to the user
        vscode.window.showInformationMessage('Hello World!');
    });

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

    // daemon = spawn('importjs', ['start', `--parent-pid=${process.pid}`]);

    // daemon.stdout.on('data', (data) => {
    //     console.log(`stdout: ${data}`);
    // });

    // daemon.stderr.on('data', (data) => {
    //     console.log(`stderr: ${data}`);
    // });

    // daemon.on('close', (code) => {
    //     console.log(`child process exited with code ${code}`);
    // });

    // setTimeout(() => {
    //     console.log('Running it!')
        importWord()
    // }, 1000)

    // vscode.workspace.onDidOpenTextDocument
    // console.log('Root', currentFilePath())

    context.subscriptions.push(disposable);

    console.log('File path:', currentFilePath())
}

exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
    if (daemon) {
        daemon.kill()
    }
}

exports.deactivate = deactivate;