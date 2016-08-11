var babylon = require('babylon');
var MagicString = require('magic-string');

/**
 * Given a string JavaScript source which contains async functions, return a
 * MagicString which has transformed generators.
 *
 * MagicString has two important functions that can be called: .toString() and
 * .generateMap() which returns a source map, as well as a property .isEdited
 * which is true when any async functions were transformed.
 *
 * Options:
 *
 *   - sourceMap: (default: false) collects data to produce a correct source map.
 *                 provide true if you plan on calling generateMap().
 *   - fastSkip: (default: true) returns the source directly if it doesn't find
 *               the word "async" in the source.
 *   - includeHelper: (default: true) includes the __async function in the file.
 */
module.exports = function asyncToGen(source, options) {
  var editor = new MagicString(source);
  editor.isEdited = false;

  // Cheap trick for files that don't actually contain async functions
  if (!(options && options.fastSkip === false) &&
      source.indexOf('async ') === -1) {
    return editor;
  }

  // Babylon is one of the sources of truth for async syntax. This parse
  // configuration is intended to be as permissive as possible.
  var ast = babylon.parse(source, {
    allowImportExportEverywhere: true,
    allowReturnOutsideFunction: true,
    allowSuperOutsideMethod: true,
    sourceType: 'module',
    plugins: [ '*', 'jsx', 'flow' ],
  });

  ast.shouldIncludeHelper = !(options && options.includeHelper === false);
  var sourceMap = options && options.sourceMap === true;

  visit(ast, editor, asyncToGenVisitor, sourceMap);

  if (ast.isEdited) {
    editor.isEdited = true;
  }

  return editor;
}

/**
 * A helper function which accepts a generator function and returns a Promise
 * based on invoking the generator and resolving yielded Promises.
 *
 * Automatically included at the end of files containing async functions,
 * but also exported from this module for other uses. See ./async-node for an
 * example of another usage.
 */
var asyncHelper =
  'function __async(f){' +
    'var g=f();' +
    'return new Promise(function(s,j){' +
      'function c(a,x){' +
        'try{' +
          'var r=g[x?"throw":"next"](a)' +
        '}catch(e){' +
          'return j(e)' +
        '}' +
        'return r.done?' +
          's(r.value):' +
          'Promise.resolve(r.value).then(c,d)' +
      '}' +
      'function d(e){' +
        'return c(e,1)' +
      '}' +
      'c()' +
    '})' +
  '}';

module.exports.asyncHelper = asyncHelper;

// A collection of methods for each AST type names which contain async functions to
// be transformed.
var asyncToGenVisitor = {
  AwaitExpression: {
    enter: function (editor, node) {
      editor.overwrite(node.start, node.start + 5, 'yield');
    }
  },
  ArrowFunctionExpression: {
    enter: enterFunction,
    leave: leaveArrowFunction
  },
  FunctionDeclaration: {
    enter: enterFunction,
    leave: leaveFunction
  },
  FunctionExpression: {
    enter: enterFunction,
    leave: leaveFunction
  },
  ObjectMethod: {
    enter: enterFunction,
    leave: leaveFunction
  },
  ClassMethod: {
    enter: enterFunction,
    leave: leaveFunction
  },
  Program: {
    enter: function (editor, node, ast) {
      ast.scope = [ node ];
    },
    leave: function (editor, node, ast) {
      if (ast.isEdited && ast.shouldIncludeHelper) {
        editor.append('\n' + asyncHelper + '\n');
      }
    }
  },
  ThisExpression: {
    enter: function (editor, node, ast) {
      var envRecord = ast.scope[ast.scope.length - 1];
      if (envRecord.async) {
        envRecord.referencesThis = true;
      }
    }
  }
};

function enterFunction(editor, node, ast) {
  ast.scope.push(node);
}

function leaveFunction(editor, node, ast) {
  ast.scope.pop();
  if (node.async) {
    ast.isEdited = true;
    var idx = findTokenIndex(ast.tokens, node.start);
    if (node.static) {
      idx++;
    }
    editor.remove(ast.tokens[idx].start, ast.tokens[idx + 1].start);
    editor.insertLeft(node.body.start + 1, 'return __async(function*(){');
    editor.insertRight(node.body.end - 1, node.referencesThis ? '}.bind(this))' : '})');
  }
}

function leaveArrowFunction(editor, node, ast) {
  ast.scope.pop();
  if (node.referencesThis) {
    ast.scope[ast.scope.length - 1].referencesThis = true;
  }
  if (node.async) {
    ast.isEdited = true;
    editor.remove(node.start, node.start + 6);
    if (node.body.type === 'BlockStatement') {
      editor.overwrite(node.body.start, node.body.start + 1, '__async(function*(){');
      editor.overwrite(node.body.end - 1, node.body.end, node.referencesThis ? '}.bind(this))' : '})');
    } else {
      var idx = findTokenIndex(ast.tokens, node.body.start);
      editor.insertRight(ast.tokens[idx - 1].end, '__async(function*(){');
      editor.insertLeft(node.body.start, 'return ');
      editor.insertRight(node.body.end, node.referencesThis ? '}.bind(this))' : '})');
    }
  }
}

// Given the AST output of babylon parse, walk through in a depth-first order,
// calling methods on the given visitor, providing editor as the first argument.
function visit(ast, editor, visitor, sourceMap) {
  var stack;
  var parent;
  var keys = [];
  var index = -1;

  do {
    index++;
    if (stack && index === keys.length) {
      parent = stack.parent;
      keys = stack.keys;
      index = stack.index;
      stack = stack.prev;
      var node = parent ? parent[keys[index]] : ast.program;
      if (node.type) {
        var visitFn = visitor[node.type] && visitor[node.type].leave;
        visitFn && visitFn(editor, node, ast);
      }
    } else {
      var node = parent ? parent[keys[index]] : ast.program;
      if (node && typeof node === 'object') {
        if (node.type) {
          if (sourceMap) {
            editor.addSourcemapLocation(node.start);
            editor.addSourcemapLocation(node.end);
          }
          var visitFn = visitor[node.type] && visitor[node.type].enter;
          if (visitFn && visitFn(editor, node, ast) === false) {
            continue;
          }
        }
        stack = { parent: parent, keys: keys, index: index, prev: stack };
        parent = node;
        keys = Object.keys(node);
        index = -1;
      }
    }
  } while (stack);
}

// Given an array of sorted tokens, find the index of the token which contains
// the given offset. Uses binary search for O(log N) performance.
function findTokenIndex(tokens, offset) {
  var min = 0;
  var max = tokens.length - 1;

  while (min <= max) {
    var ptr = (min + max) / 2 | 0;
    var token = tokens[ptr];
    if (token.end <= offset) {
      min = ptr + 1;
    } else if (token.start > offset) {
      max = ptr - 1;
    } else {
      return ptr;
    }
  }
}
