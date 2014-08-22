
/**
 * Default middleware for arbitrary files.
 * Should always go last.
 */

module.exports = function () {
  return function* walkFile(next) {
    // already handled by upstream middleware
    // this should be the LAST middleware
    // as it adds the file as a generic file
    // it only checks for the file's existence.
    if (this.file) return yield* next

    var file = this.setFile()
    file.dependencies = {}
    yield* file.setSource()
    yield* next
  }
}
