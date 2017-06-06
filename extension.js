const vscode = require("vscode");

const { syncFileContents, currentWord } = require("./lib/project");
const { start, kill, run, on } = require("./lib/daemon");

const STATUS_BAR_DELAY = 3000;

function handleMessage(json) {
  const { messages, fileContent, unresolvedImports, error, goto } = json;

  if ("error" in json) {
    vscode.window.showWarningMessage(
      `ImportJS encountered an error: ${error.message}`
    );
    return;
  }

  if ("messages" in json && messages.length > 0) {
    vscode.window.setStatusBarMessage(messages.join("\n"), STATUS_BAR_DELAY);
  }

  if ("goto" in json) {
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

  on("message", handleMessage);

  start();
}

function deactivate() {
  kill();
}

exports.activate = activate;
exports.deactivate = deactivate;
