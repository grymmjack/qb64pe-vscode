// Test token extraction with underscores
function getQB64WordFromDocument_Test(lineOfCode, cursorPosition) {
  const stop = " (+-=<>[{}]`);:.,%#`&!\t";
  let retvalue = "";

  // Get the first part of the string
  for (let i = cursorPosition - 1; i >= 0; i--) {
    let currentChar = lineOfCode.substring(i - 1, i);
    if (currentChar == "" || stop.indexOf(currentChar) > -1) {
      break;
    }
    retvalue = currentChar + retvalue;
  }

  // Get the last part of the string
  for (let i = cursorPosition; i <= lineOfCode.length; i++) {
    let currentChar = lineOfCode.substring(i - 1, i);
    if (currentChar == "" || stop.indexOf(currentChar) > -1) {
      break;
    }
    retvalue = retvalue + currentChar;
  }
  return retvalue.replaceAll("'", "");
}

// Test cases
const testCases = [
  { line: "GJ_BBX_InitDefaults", cursor: 10, expected: "GJ_BBX_InitDefaults" },
  {
    line: "    GJ_BBX_InitDefaults",
    cursor: 14,
    expected: "GJ_BBX_InitDefaults",
  },
  {
    line: "CALL GJ_BBX_InitDefaults",
    cursor: 10,
    expected: "GJ_BBX_InitDefaults",
  },
  { line: "_DISPLAY", cursor: 4, expected: "_DISPLAY" },
  { line: "    _NEWIMAGE(800, 600)", cursor: 8, expected: "_NEWIMAGE" },
];

console.log("Testing QB64PE token extraction:");
testCases.forEach((test) => {
  const result = getQB64WordFromDocument_Test(test.line, test.cursor);
  const passed = result === test.expected;
  console.log(
    `Line: "${test.line}" at pos ${test.cursor} -> "${result}" ${
      passed ? "✓" : "✗ Expected: " + test.expected
    }`
  );
});
