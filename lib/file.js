
var debug = require('debug')('deps-walk:file')
var typeis = require('type-is').is
var mime = require('mime-types')
var pathis = require('path-is')
var crypto = require('crypto')
var assert = require('assert')
var path = require('path')
var fs = require('mz/fs')

module.exports = File

var Dependency = require('./dependency')

var slice = [].slice
var stat = fs.stat
var read = fs.readFile

/**
 * Create a `File` object representing a local resource.
 * It should ALWAYS be "absolute".
 * Local resources should begin with `/` or `C:\`
 * or whatever Windows does.
 *
 * @param {String} uri
 * @api public
 */

function File(uri) {
  if (!(this instanceof File)) return new File(uri)

  assert(!pathis.url(uri), 'URI must be a local path.')
  assert(!pathis.data(uri), 'URI must not be a data URI.')
  assert(pathis.absolute(uri), 'URI must be an absolute URI.')

  // to do: set most of this shit automatically when changing .basename and stuff
  // remove query strings and #s
  this.uri = uri
  this.dirname = path.dirname(uri)
  this.type =
  this.basename = path.basename(removeAffixes(uri))
  this.logs = []
}

File.prototype = {
  constructor: File,
  remote: '', // remote URI
  source: '', // source URI
  hash: '', // base64-encoded sha256sum
  mtime: null, // last modified date
  length: null, // source file size
  exists: true,

  set type(val) {
    this._type = mime.lookup(val)
  },

  get type() {
    return this._type
  },

  /**
   * Check whether to treat this dependency as any of the types.
   * This is specifically for checking for transformations.
   *
   * @api public
   */

  is: function (types) {
    if (!Array.isArray(types)) types = slice.call(arguments)
    return typeis(this.type, types)
  },

  /**
   * Push a dependency. Could use a better verb,
   * but I wanted to keep it short.
   *
   * @param {String} path (lookup name)
   * @param {String} uri (canonical name)
   * @api public
   */

  push: function (path, uri, opts) {
    opts = opts || {}
    if (typeof uri === 'object') {
      opts = uri
      uri = path
    } else if (!uri) {
      uri = path
    }

    var deps = this.dependencies || (this.dependencies = {})
    debug('setting %s\'s dependency %s as %s', this.uri, path, uri)

    if (pathis.relative(path)) {
      // convert all relative paths to an absolute
      uri = this.resolve(path)
      debug('resolved path %s to %s', path, uri)
    } else if (!pathis.url(path)) {
      if (pathis.data(path))
        debug('dependency is a data URL, ignoring: %s', path)
      else // absolute path, which is ambiguous
        debug('dependency is an absolute path, ignoring: %s', path)
      return
    }

    var dep = deps[path] = new Dependency(uri)
    // add properties to dependency
    Object.keys(opts).forEach(function (key) {
      dep[key] = opts[key]
    })
    // keep an ascending list of priorities
    // since dependencies will probably be rewritten
    dep.priority = Object.keys(deps).length - 1
    return this
  },

  /**
   * Resolve a path against this file.
   *
   * @param {String} path
   * @api public
   */

  resolve: function (uri) {
    var trailingSlash = /\/$/.test(uri) ? '/' : ''
    return pathis.relative(uri)
      ? (path.resolve(this.dirname, uri) + trailingSlash)
      : uri
  },

  /**
   * Used only within middleware to set the source
   * when the source is not the same as the URI.
   * Specifically, when the plugin compiles from a source.
   * It should be a URI as well.
   *
   * @param {String} source
   * @api public
   */

  setSource: function* (source) {
    source = removeAffixes(source || this.uri)
    if (this.source) return debug('source already set: %s, %s', this.source, source)

    this.source = source
    try {
      var stats = this.stats = yield stat(source)
      this.length = stats.size
      this.mtime = stats.mtime
    } catch (err) {
      this.exists = false
      if (err.code === 'ENOENT') {
        var err = new Error('Local does not exist: ' + source)
        err.status = 404
        throw err
      }
      throw err
    }
  },

  /**
   * @api private
   */

  getBuffer: function* () {
    if (this.buffer) return this.buffer
    return this.buffer = yield read(this.source)
  },

  /**
   * @api private
   */

  getHash: function* () {
    if (this.hash) return this.hash
    var buffer = yield* this.getBuffer()
    return this.hash = calculate(buffer).toString('base64')
  },

  /**
   * @api public
   */

  getString: function* () {
    if (this.string) return this.string
    var buffer = yield* this.getBuffer()
    return this.string = buffer.toString('utf8')
  },

  /**
   * Check whether this Local is stale.
   * If it is, we return a new `Local` instance.
   * i.e. if we need to re-resolve it.
   *
   * @return {Object} Local
   * @api private
   */

  stale: function* () {
    var stale = new File(this.uri)
    yield* stale.setSource(this.source)
    if (!this.exists) return stale // file has been added
    if (this.mtime.getTime() !== stale.mtime.getTime()) return stale
    if (this.length !== stale.length) return stale
    if ((yield* this.getHash()) !== (yield* stale.getHash())) return stale
    return false
  },
}

function removeAffixes(string) {
  return string.replace(/[#?].*$/, '')
}

function calculate(buffer) {
  return crypto.createHash('sha256').update(buffer)
}
