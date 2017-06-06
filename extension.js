// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");

const { WorkspaceEdit } = vscode;

const { spawn, exec } = require("child_process");
const oboe = require("oboe");

const textEditsForDiff = require("./lib/textEditsForDiff");

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

// https://github.com/codemirror/CodeMirror/blob/master/mode/javascript/javascript.js#L25
const wordRE = /[\w$\xa1-\uffff]+/;

function currentWord() {
  const position = activeEditor().selection.active;
  const range = currentDocument().getWordRangeAtPosition(position, wordRE);

  if (!range) {
    return null;
  }

  return currentDocument().getText(range);
}

function projectDirectoryPath() {
  return vscode.workspace.rootPath;
}

function handleMessage(json) {
  const { messages, fileContent, unresolvedImports, error, goto } = json;

  if ("error" in json) {
    console.log("Error executing importjs", error);
    return;
  }

  if ("messages" in json && messages.length) {
    vscode.window.setStatusBarMessage(messages.join("\n"), 3000);
  }

  if ("goto" in json) {
    console.log("opening", goto);
    vscode.workspace.openTextDocument(goto).then(document => {
      vscode.window.showTextDocument(document);
    });
    return;
  }

  // Always sync resolved imports, even if there are some remaining to resolve
  if ("fileContent" in json) {
    syncFileContents(fileContent);
  }

  if (
    "unresolvedImports" in json && Object.keys(unresolvedImports).length > 0
  ) {
    const questions = Object.keys(unresolvedImports).map(name => {
      const matches = unresolvedImports[name];
      const options = matches.map(({ displayName, importPath, filePath }) => {
        return { label: displayName, description: filePath, importPath };
      });

      return { name, options };
    });

    const getAnswers = (remaining, results = []) => {
      if (remaining.length === 0) {
        return Promise.resolve(results);
      }

      const { name, options } = remaining[0];

      return vscode.window
        .showQuickPick(options, { placeHolder: `Import ${name} from` })
        .then(selected => {
          // If user cancels, still import the modules they've resolved so far
          if (!selected) {
            return Promise.resolve(results);
          }

          const answer = { name, path: selected.importPath };

          return getAnswers(remaining.slice(1), results.concat(answer));
        });
    };

    getAnswers(questions).then(answers => {
      console.log("Answers!", answers);

      const imports = answers.reduce((imports, answer) => {
        const { name, path } = answer;

        imports[name] = path;

        return imports;
      }, {});

      run("add", imports);
    });
  }
}

function run(command, commandArg) {
  if (!daemon) {
    startDaemon();
  }

  const payload = {
    command: command,
    commandArg: commandArg,
    pathToFile: currentFilePath(),
    fileContent: currentFileContents()
  };

  daemon.stdin.write(JSON.stringify(payload) + "\n");

  console.log('run', command, 'ok')
}

function getImportJSPath() {
  return new Promise((resolve, reject) => {
    try {
      exec("which importjs", (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
    } catch (error) {
      reject(error)
    }
  });
}

function startDaemon() {
  const failedToStart = error => {
    daemon = null;
    console.warn("Failed to start ImportJS server", error);

    getImportJSPath()
      .then(() => {
        vscode.window.showWarningMessage(
          `Failed to start ImportJS server: ${error.message}`
        );
      })
      .catch(() => {
        vscode.window.showWarningMessage(
          `Failed to start ImportJS server: importjs not found in PATH`
        );
      });
  };

  try {
    daemon = spawn("importjs", ["start", `--parent-pid=${process.pid}`], {
      cwd: projectDirectoryPath()
    });

    daemon.on("error", failedToStart);
    daemon.on("close", () => {
      daemon = null
    })
  } catch (error) {
    failedToStart(error);
    return;
  }

  // Ignore the first message passed. This just gives the log path, and isn't json.
  daemon.stdout.once("data", () => {
    // After the first message, handle top-level JSON objects
    oboe(daemon.stdout).node("!", handleMessage);
  });
}

function activate(context) {
  const subscriptions = [
    vscode.commands.registerCommand("importjs.word", () =>
      run("word", currentWord())
    ),
    vscode.commands.registerCommand("importjs.goto", () =>
      run("goto", currentWord())
    ),
    vscode.commands.registerCommand("importjs.fix", () => run("fix"))
  ];

  subscriptions.forEach(sub => context.subscriptions.push(sub));

  startDaemon();
}

function deactivate() {
  if (daemon) {
    daemon.kill();
  }
}

exports.activate = activate;
exports.deactivate = deactivate;
