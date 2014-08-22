
describe('css', function () {
  var entrypoint = fixture('css')
  var walker
  var tree

  it('should walk', co(function* () {
    walker = defaults(Walker().add(entrypoint))
    tree = yield* walker.tree()
  }))

  it('should return the correct tree', function () {
    var node = tree[entrypoint]
    assert(node)
    assert.equal(node.uri, entrypoint)
    var file = node.file
    assert.ok(file)
    assert.ok(file.mtime)
    assert.ok(file.basename)
    var deps = file.dependencies
    assert(deps['./something.css'])
    assert.equal(deps['./something.css'].priority, 0)
    assert(deps['else.css'])
    assert.equal(deps['else.css'].priority, 1)
    assert(deps['./something.css'].file.dependencies['what.css'])
  })

  it('should flatten in the correct order', function () {
    var files = Walker.flatten(tree).map(function (x) {
      return x.basename
    })
    assert.deepEqual(files, [
      'what.css',
      'something.css',
      'else.css',
      'index.css',
    ])
  })
})

describe('css-image', function () {
  var entrypoint = fixture('css-image')
  var walker
  var tree

  it('should walk', co(function* () {
    walker = defaults(Walker().add(entrypoint))
    tree = yield* walker.tree()
  }))

  it('should return the correct tree', function () {
    tree = tree[entrypoint]
    assert(tree)
    assert(tree.file.dependencies['something.png'])
  })
})

describe('css-ignore', function () {
  var entrypoint = fixture('css-ignore')

  it('should not parse absolute local paths and data URIs', co(function* () {
    var walker = defaults(Walker()).add(entrypoint)
    var tree = yield* walker.tree()
    assert(!Object.keys(tree[entrypoint].file.dependencies).length)
  }))
})

function fixture(name) {
  return path.join(__dirname, 'fixtures', name, 'index.css')
}
