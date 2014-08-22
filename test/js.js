
describe('js', function () {
  var entrypoint = fixture('js')
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
    assert(deps['./emitter.js'])
    assert(deps['./lol.js'])
    assert(deps['./something.js'])
  })
})

describe('js-circular', function () {
  var entrypoint = fixture('js-circular')
  var walker
  var nodes
  var tree

  it('should walk', co(function* () {
    walker = defaults(Walker().add(entrypoint))
    tree = yield* walker.tree()
  }))

  it('should flatten', function () {
    nodes = Walker.flatten(tree)
    assert.deepEqual(nodes, Walker.flatten(tree[entrypoint]))
    assert.deepEqual(nodes, Walker.flatten(tree[entrypoint].file))
  })

  it('should walk again', co(function* () {
    tree = yield* walker.tree()
  }))

  it('should return the same nodes', function () {
    assert.deepEqual(nodes, Walker.flatten(tree))
  })
})

function fixture(name) {
  return path.join(__dirname, 'fixtures', name, 'index.js')
}
