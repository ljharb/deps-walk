
var debug = require('debug')('deps-walk:plugins:js')
var format = require('esprima-error-formatter')
var parse = require('deps-parse').js

module.exports = function () {
  return function* walkJS(next) {
    if (!this.is('js')) return yield* next

    var file = this.setFile()
    yield* file.setSource()

    file.dependencies = file.dependencies || {}
    var string = yield* file.getString()

    var mod
    try {
      mod = yield parse(string)
    } catch (err) {
      throw format(err, string, file.uri)
    }
    file.module = {
      type: mod.type,
      default: mod.default,
    }
    mod.dependencies.forEach(function (name) {
      file.push(name)
    })

    yield* next
  }
}
