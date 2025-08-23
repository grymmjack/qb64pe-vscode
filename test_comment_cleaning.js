function cleanCommentLine(line) {
  let cleaned = line;
  cleaned = cleaned.replace(/^'+/, "");
  cleaned = cleaned.replace(/^\s+/, "");
  return cleaned;
}

const testCases = [
  "''",
  "' Initialize the bounding box",
  "' @param x INTEGER x Position",
  "'",
  "''    ",
  "'    Some text with spaces",
  "''' Multiple apostrophes",
  "'@param without space",
];

console.log("Testing comment cleaning:");
testCases.forEach((test) => {
  const result = cleanCommentLine(test);
  console.log(`Input: "${test}" -> Output: "${result}"`);
});
