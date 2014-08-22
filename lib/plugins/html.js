
var debug = require('debug')('deps-walk:plugins:html')
var parse = require('deps-parse').html

module.exports = function () {
  return function* walkHTML(next) {
    if (!this.is('html')) return yield* next

    var file = this.setFile()
    yield* file.setSource()
    file.dependencies = file.dependencies || {}
    var string = yield* file.getString()

    var dependencies = yield parse(string)
    dependencies.forEach(function (m) {
      file.push(m.path, {
        method: m.type,
      })
    })

    yield* next
  }
}
