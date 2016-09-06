var fs = require('fs');
var asyncToGen = require('./index');

var prev = require.extensions['.js'];

require.extensions['.js'] = function(module, filename) {
  if (filename.indexOf('node_modules') === -1) {
    if (prev) {
      // we assume babel was configured, containing the same intention as this module
      prev(module, filename);
    } else {
      var source = fs.readFileSync(filename, 'utf8');
      module._compile(asyncToGen(source).toString(), filename);
    }
  } else if (prev) {
    prev(module, filename);
  } else {
    var source = fs.readFileSync(filename, 'utf8');
    module._compile(source, filename);
  }
};
