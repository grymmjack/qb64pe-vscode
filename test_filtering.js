function cleanCommentLine(line) {
  let cleaned = line;
  cleaned = cleaned.replace(/^'+/, "");
  cleaned = cleaned.replace(/^\s+/, "");
  return cleaned;
}

const testComments = [
  "' This is a convenience SUB for updating and drawing the bounding box",
  "' @param showHUD INTEGER Show the HUD debug information? (TRUE | FALSE)",
  "' You can call this single SUB from your main loop",
  "' @param x INTEGER x Position",
  "' @param y INTEGER y Position",
  "' This function calculates something useful",
  "'@param value SINGLE A test parameter without space",
];

console.log("Testing comment filtering:");
testComments.forEach((comment) => {
  const clean = cleanCommentLine(comment);
  const isParam = clean.match(/^\s*@param\s+/i);
  const includeInDoc = !isParam;
  console.log(`"${clean}" -> Include in docs: ${includeInDoc}`);
});
