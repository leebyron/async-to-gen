var asyncToGen = require('./index');
var pirates = require('pirates');

// Export this function as the primary export.
var exports = module.exports = setOptions;
// Treat the exported object as "exports" and supply this function.
exports.setOptions = setOptions;
// Revert will exist on the exports after the transform hook has been added.
exports.revert = void 0;

// Supported options:
//
//   - sourceMaps: Include inline source maps. (default: true)
//   - includes: A Regexp/String to determine which files should be transformed.
//               (alias: include)
//   - excludes: A Regexp/String to determine which files should not be
//               transformed, defaults to ignoring /node_modules/, provide null
//               to exclude nothing. (alias: exclude)
var options;
function setOptions(newOptions) {
  options = newOptions;
  return exports;
}

var exts = [ '.js', '.mjs', '.jsx', '.flow', '.es6' ];

// Use pirates to swizzle Module#_compile in a way that's compatible with
// other tools, saving the revert on the exports.
exports.revert = pirates.addHook(transform, { exts: exts, matcher: matcher });

function transform(code, filename) {
  var sourceMaps = options && 'sourceMaps' in options ? options.sourceMaps : true;
  var result = asyncToGen(code, options);
  var transformedCode = result.toString();
  if (sourceMaps) {
    var map = result.generateMap();
    delete map.file;
    delete map.sourcesContent;
    map.sources[0] = filename;
    transformedCode += '\n//# sourceMappingURL=' + map.toUrl();
  }
  return transformedCode;
}

function matcher(filename) {
  var includes = options && regexpPattern(options.includes || options.include);
  var excludes =
    options && 'excludes' in options ? regexpPattern(options.excludes) :
    options && 'exclude' in options ? regexpPattern(options.exclude) :
    /\/node_modules\//;
  return (!includes || includes.test(filename)) && !(excludes && excludes.test(filename));
}

// Given a null | string | RegExp | any, returns null | Regexp or throws a
// more helpful error.
function regexpPattern(pattern) {
  if (!pattern) {
    return pattern;
  }
  // A very simplified glob transform which allows passing legible strings like
  // "myPath/*.js" instead of a harder to read RegExp like /\/myPath\/.*\.js/.
  if (typeof pattern === 'string') {
    pattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*');
    if (pattern[0] !== '/') {
      pattern = '/' + pattern;
    }
    return new RegExp(pattern);
  }
  if (typeof pattern.test === 'function') {
    return pattern;
  }
  throw new Error(
    'async-to-gen: includes and excludes must be RegExp or path strings. Got: ' + pattern
  );
}
