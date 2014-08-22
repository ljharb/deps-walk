
describe('html', function () {
  var entrypoint = fixture('html')
  var walker
  var tree

  it('should walk', co(function* () {
    walker = defaults(Walker().add(entrypoint))
    tree = yield* walker.tree()
  }))

  it('should return the correct tree', function () {
    tree = tree[entrypoint]
    assert(tree)
    assert.equal(tree.uri, entrypoint)
    var file = tree.file
    assert.ok(file)
    assert.ok(file.mtime)
    assert.ok(file.basename)
    var deps = file.dependencies
    assert(deps['hello-world.html'])
    assert(deps['platform.js'])

    var dep = deps['hello-world.html']
    assert.equal('import', dep.method)
  })
})

function fixture(name) {
  return path.join(__dirname, 'fixtures', name, 'index.html')
}
