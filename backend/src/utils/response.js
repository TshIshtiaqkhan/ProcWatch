function ok(data) {
  return { success: true, data };
}

function fail(code, message) {
  return { success: false, error: { code, message } };
}

module.exports = { ok, fail };
