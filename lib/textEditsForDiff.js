// Adapted from Atom TextBuffer setTextViaDiff implementation
// https://github.com/atom/text-buffer/blob/141e35614ff4a0bed3c113782ee58029a53de775/src/text-buffer.coffee#L640

// Copyright (c) 2013 GitHub Inc.

// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
// FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
// IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

const { Position, Range, TextEdit } = require("vscode");
const diff = require("diff");

const newlineRegex = /\r\n|\n|\r/g;

const endsWithNewline = str => /[\r\n]+$/g.test(str);

const computeBufferColumn = str => {
  const newlineIndex = Math.max(str.lastIndexOf("\n"), str.lastIndexOf("\r"));

  if (endsWithNewline(str)) {
    return 0;
  } else if (newlineIndex === -1) {
    return str.length;
  } else {
    return str.length - newlineIndex - 1;
  }
};

function textEditsForDiff(originalText, newText) {
  let row = 0;
  let column = 0;

  const lineDiff = diff.diffLines(originalText, newText);
  const edits = [];

  lineDiff.forEach(change => {
    // Using change.count does not account for lone carriage-returns
    const match = change.value.match(newlineRegex);
    const lineCount = match ? match.length : 0;

    if (change.added) {
      const range = new Range(
        new Position(row, column),
        new Position(row, column)
      );

      edits.push(new TextEdit(range, change.value));

      row += lineCount;
      column = computeBufferColumn(change.value);
    } else if (change.removed) {
      const endRow = row + lineCount;
      const endColumn = column + computeBufferColumn(change.value);

      const range = new Range(
        new Position(row, column),
        new Position(endRow, endColumn)
      );

      edits.push(new TextEdit(range, ""));
    } else {
      row += lineCount;
      column = computeBufferColumn(change.value);
    }
  });

  return edits;
}

module.exports = textEditsForDiff;
