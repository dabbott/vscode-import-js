const vscode = require("vscode");

const {
  currentFilePath,
  currentWord,
  syncFileContents
} = require("./lib/project");
const { start, kill, run, on } = require("./lib/daemon");

const STATUS_BAR_DELAY = 3000;

function handleMessage(json) {
  const { messages, fileContent, unresolvedImports, error, goto } = json;

  if (error) {
    vscode.window.showWarningMessage(
      `ImportJS encountered an error: ${error.message}`
    );
    return;
  }

  if (messages && messages.length > 0) {
    vscode.window.setStatusBarMessage(messages.join("\n"), STATUS_BAR_DELAY);
  }

  if (goto) {
    vscode.workspace.openTextDocument(goto).then(document => {
      vscode.window.showTextDocument(document);
    });
    return;
  }

  // Always sync resolved imports, even if there are some remaining to resolve
  if ("fileContent" in json) {
    syncFileContents(fileContent);
  }

  if (unresolvedImports && Object.keys(unresolvedImports).length > 0) {
    const imports = Object.keys(unresolvedImports).map(name => {
      return { name, options: unresolvedImports[name] };
    });

    // Ask the user to resolve each import, one at a time. When all imports are
    // resolved, or when the user cancels, the chain of promises will resolve.
    const requestResolutions = (remaining, resolutions = []) => {
      if (remaining.length === 0) {
        return Promise.resolve(resolutions);
      }

      const { name, options } = remaining[0];

      let pickerItems = options
        // Filter out duplicates
        .reduce((uniqueImports, option) => {
          const duplicate = uniqueImports.find(
            ({ displayName }) => option.displayName === displayName
          );

          if (duplicate) {
            return uniqueImports;
          }

          return uniqueImports.concat(option);
        }, [])
        .map(({ displayName, importPath }) => {
          return {
            label: displayName,
            importPath
          };
        });

      return vscode.window.showQuickPick(pickerItems).then(selected => {
        // If user cancels, still import the modules they've resolved so far
        if (!selected) {
          return Promise.resolve(resolutions);
        }

        const { importPath } = selected;
        const resolution = {
          name,
          path: importPath
        };

        return requestResolutions(
          remaining.slice(1),
          resolutions.concat(resolution)
        );
      });
    };

    requestResolutions(imports).then(resolutions => {
      const imports = resolutions.reduce((imports, resolution) => {
        const { name, path } = resolution;
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
