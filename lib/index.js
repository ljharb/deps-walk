
var Walker = module.exports = require('./walker')
Walker.dependency = require('./dependency')
Walker.flatten = require('./flatten')
Walker.file = require('./file')

Walker.plugins = {}

require('fs').readdirSync(require('path').join(__dirname, 'plugins'))
.forEach(function (name) {
  if (name[0] === '.') return
  Walker.plugins[name.replace('.js', '')] = require('./plugins/' + name)
})
