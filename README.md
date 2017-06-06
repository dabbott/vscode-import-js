# VS Code ImportJS extension

This is the VS Code extension for ImportJS.

## Installing

1. Install `import-js` globally:

    ```bash
    npm install --global import-js
    ```

2. [Configure ImportJS](https://github.com/galooshi/import-js#configuration) for your project

3. Open the root directory of your project (File -> Open…)

4. Import a file!

## Default keybindings

By default, `vscode-import-js` attempts to set up the following keybindings:

Mapping       | Action      | Description
--------------|-------------|---------------------------------------------------------------------
`Cmd+Shift+j` | Import word | Import the module for the variable under the cursor.
`Cmd+Shift+i` | Fix imports | Import any missing modules and remove any modules that are not used.
`Cmd+Shift+k` | Go to word  | Go to the module of the variable under the cursor.