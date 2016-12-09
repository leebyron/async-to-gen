var asyncToGen = require('./index');

var options;
module.exports = function setOptions(newOptions) {
  options = newOptions;
}

// Swizzle Module#_compile on each applicable module instance.
// NOTE: if using alongside Babel or another require-hook which simply
// over-writes the require.extensions and does not continue execution, then
// this require hook must come after it. Encourage those module authors to call
// the prior loader in their require hooks.
var jsLoader = require.extensions['.js'];
var exts = [ '.js', '.jsx', '.flow', '.es6' ];
exts.forEach(function (ext) {
  var superLoader = require.extensions[ext] || jsLoader;
  require.extensions[ext] = function (module, filename) {
    if (filename.indexOf('/node_modules/') === -1) {
      var super_compile = module._compile;
      module._compile = function _compile(code, filename) {
        var sourceMaps = options && options.sourceMaps;
        var result = asyncToGen(code, options);
        var code = result.toString();
        if (sourceMaps) {
          var map = result.generateMap();
          delete map.file;
          delete map.sourcesContent;
          map.sources[0] = filename;
          code += '\n//# sourceMappingURL=' + map.toUrl();
        }
        super_compile.call(this, code, filename);
      };
    }
    superLoader(module, filename);
  };
});
