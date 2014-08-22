
var util = require('util')
var assert = require('assert')
var pathis = require('path-is')
var compose = require('composition')
var cache = require('lru-cache-dummy')
var debug = require('debug')('deps-walk:walker')
var EventEmitter = require('events').EventEmitter
var isGeneratorFunction = require('is-generator').fn

var Dependency = require('./dependency')

util.inherits(Walker, EventEmitter)

module.exports = Walker

function Walker(options) {
  if (!(this instanceof Walker)) return new Walker(options)

  options = options || {}

  EventEmitter.call(this, options)
  this.setMaxListeners(0)

  // all the cached file objects based on the URI
  this.cache = options.cache || cache()
  // all the current file objects based on the URI
  this.files = {}
  // resolves in progress
  this.progress = {}
  // list of middleware
  this.middleware = []
  // the composed middleware function
  this.downstream = compose(this.middleware)
  // each entry point will be its own tree
  this.dependencies = {}
}

/**
 * Entry point must always be an absolute URI.
 *
 * @param {String} uri
 * @api public
 */

Walker.prototype.add = function (uri) {
  assert(pathis.absolute(uri) && !pathis.url(uri), 'Path must be an absolute, local URI.')
  this.dependencies[uri] = new Dependency(uri)
  return this
}

/**
 * Push a generator function to the list of middleware.
 *
 * @param {GeneratorFunction} fn
 * @api public
 */

Walker.prototype.use = function (fn) {
  assert(isGeneratorFunction(fn), 'Walker middleware must be generator functions.')
  this.middleware.push(fn)
  return this
}

/**
 * @api public
 */

Walker.prototype.tree = function* () {
  yield* this.resolveDependencies(this)
  // unset the `.files` object for the next walk
  this.files = {}
  this.progress = {}
  return this.dependencies
}

/**
 * Resolve all the .dependencies of an object.
 *
 * @param {Object} File
 * @api private
 */

Walker.prototype.resolveDependencies = function* (file) {
  var deps = file.dependencies
  yield Object.keys(deps).map(function (name) {
    return this.resolve(deps[name])
  }, this)
  return file
}

/**
 * Resolve a single .dependency of an object.
 *
 * @param {Object} dependency
 * @api private
 */

Walker.prototype.resolve = function* (dependency) {
  var uri = dependency.uri
  assert(uri, 'Every dependency must have a URI.')
  assert(pathis.absolute(uri), 'Dependency URIs must be a local, absolute path: ' + uri)
  debug('resolving %s', uri)

  // already resolved this URI on this walk
  if (this.files[uri]) {
    dependency.file = this.files[uri]
    debug('got file %s from instance cache', uri)
    return dependency
  }

  // resolving this URI is already in progress,
  // so we'll just asynchronously add the file.
  // we don't want this to block
  if (this.progress[uri]) {
    debug('getting file %s from progress', uri)
    this.once(uri, function (file) {
      dependency.file = file
    })
    return dependency
  }

  // now we actually resolve this dependency
  this.progress[uri] = true

  // if there's already a `.file` object, check to see if it's stale
  var file = dependency.file || this.cache.get(uri)
  // note that `stale` would return a new file object
  if (file) {
    var stale = yield* file.stale()
    if (stale) {
      // stale should always be a new object of the same type
      debug('%s is stale', file.source)
      file = dependency.file = stale
    } else {
      dependency.file = file
    }
  }

  // yield all middleware
  if (!file || !file.dependencies) {
    try {
      yield* this.downstream.call(dependency, noop.call(dependency))
    } catch (err) {
      if (err.status !== 404) throw err
      file = dependency.file
      assert(file, 'A file was not set for dependency ' + uri)
      if (!file.dependencies) file.dependencies = {}
    }
  }

  // a `.file` and its `.dependencies` must always bet set,
  // even if `.dependencies` is empty or `.file` is essentially useless
  file = dependency.file
  assert(file, 'A file was not set for dependency ' + uri)
  assert(file.dependencies, 'No dependencies were set for ' + uri)

  // recursively resolve the dependencies of this file.
  yield* this.resolveDependencies(file)

  // update the cache with this latest file
  this.cache.set(uri, this.files[uri] = file)
  this.emit(uri, file)
  debug('resolved %s', uri)
  return dependency
}

/**
 * @api private
 */

function* noop() {/* jshint noyield:true */}
