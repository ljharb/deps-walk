
var path = require('path')
var assert = require('assert')
var mime = require('mime-types')
var typeis = require('type-is').is
var debug = require('debug')('deps-walk:dependency')

module.exports = Dependency

var File = require('./file')

var slice = [].slice

/**
 * Create a `.dependencies` object.
 */

function Dependency(uri) {
  if (!(this instanceof Dependency)) return new Dependency(uri)

  this.uri = uri
  // basename
  this.type =
  this.basename = path.basename(uri)
}

Dependency.prototype = {
  set type(val) {
    this._type = mime.lookup(val)
  },

  get type() {
    return this._type
  },
}

Dependency.prototype.file = null
Dependency.prototype.remote = null

/**
 * Check whether to treat this dependency as any of the types.
 * This is specifically for filtering middleware.
 *
 * @api public
 */

Dependency.prototype.is = function (types) {
  if (!Array.isArray(types)) types = slice.call(arguments)
  var file = this.file
  if (!file || !file.type) return typeis(this.type, types)
  return file.is(types)
}

Dependency.prototype.setFile = function (uri) {
  uri = uri || this.uri
  var file = this.file
  if (file) {
    assert.equal(uri, file.uri)
    return file
  }
  return this.file = new File(uri)
}
