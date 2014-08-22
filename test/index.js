
co = require('co')
fs = require('mz/fs')
path = require('path')
assert = require('assert')

Walker = require('..')

defaults = function defaults(walker, options) {
  options = options || {}
  walker.use(Walker.plugins.js(options))
  walker.use(Walker.plugins.css(options))
  walker.use(Walker.plugins.html(options))
  walker.use(Walker.plugins.file(options))
  return walker
}

require('./js')
require('./css')
require('./html')
require('./file')
