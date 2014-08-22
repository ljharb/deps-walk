
/**
 * Walk the tree putting all dependencies first.
 *
 * @param {Object} tree or file
 * @return {Array} files
 * @api public
 */

module.exports = function flatten(tree) {
  var files = []
  // getting cirular dependency issues,
  // so we make sure not to walk down a dependency tree multiple times
  var deps = []

  // is actually a dependency object
  if (tree.file) tree = tree.file
  if (tree.dependencies) {
    // is actually a file
    walk(tree.dependencies)
    if (!~files.indexOf(tree)) files.push(tree)
  } else {
    walk(tree)
  }
  return files

  function walk(dependencies) {
    if (!dependencies || ~deps.indexOf(dependencies)) return

    deps.push(dependencies)

    Object.keys(dependencies)
    .map(function (name) {
      return dependencies[name].file
    })
    // we need to sort by priority because rewriting dependencies
    // may screw with the `dependencies` object's key ordering
    .sort(byPriority)
    .forEach(function (file) {
      if (file.exists === false) return

      // already walked
      if (~files.indexOf(file)) return

      walk(file.dependencies)

      // this file will always be last
      // unless some crazy circular dependency occurs,
      // but then at that point i don't know what to do haha
      if (!~files.indexOf(file)) files.push(file)
    })
  }
}

function byPriority(a, b) {
  return a.priority - b.priority
}
