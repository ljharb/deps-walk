
var debug = require('debug')('deps-walk:plugins:css')
var parse = require('deps-parse').css

module.exports = function () {
  return function* walkCSS(next) {
    if (!this.is('css')) return yield* next

    var file = this.setFile()
    yield* file.setSource()

    file.dependencies = file.dependencies || {}
    var string = yield* file.getString()

    var dependencies = yield parse(string)
    dependencies.imports.forEach(function (m) {
      file.push(m.path, {
        method: 'import'
      })
    })
    dependencies.urls.forEach(function (m) {
      file.push(m.path, {
        method: 'url'
      })
    })

    yield* next
  }
}
