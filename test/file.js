
describe('File Caching', function () {
  var entrypoint = path.join(__dirname, 'fixtures', 'file', 'blah.js')
  var walker
  var tree
  var file

  before(function () {
    return fs.writeFile(entrypoint, '')
  })

  after(function () {
    return fs.writeFile(entrypoint, '')
  })

  it('should walk', co(function* () {
    walker = defaults(Walker().add(entrypoint))
    tree = yield* walker.tree()
  }))

  it('should not be stale', co(function* () {
    file = tree[entrypoint].file
    var stale = yield* file.stale()
    assert(!stale)
  }))

  it('should delete', co(function* () {
    yield fs.unlink(entrypoint)
    try {
      yield* file.stale()
      throw new Error('boom')
    } catch (err) {
      assert.equal(404, err.status)
    }
  }))

  it('should create a new one', co(function* () {
    yield fs.writeFile(entrypoint, 'asdf')
    var stale = yield* file.stale()
    assert(stale)
    assert(stale !== file)
    file = stale
  }))

  it('should update mtime', co(function* () {
    // wait a second because os x sucks
    yield function (done) {
      setTimeout(done, 1001)
    }
    yield fs.utimes(entrypoint, new Date(), new Date())
    var stale = yield* file.stale()
    assert(stale)
    assert(stale !== file)
    file = stale
  }))
})
