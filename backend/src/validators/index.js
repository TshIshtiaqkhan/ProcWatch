function isValidDateString(str) {
  return typeof str === "string" && /^\d{4}-\d{2}-\d{2}$/.test(str);
}

function isNonEmptyString(str) {
  return typeof str === "string" && str.trim().length > 0;
}

module.exports = { isValidDateString, isNonEmptyString };
