var babylon = require('babylon');
var MagicString = require('magic-string');

/**
 * Given a string JavaScript source which contains Flow types, return a string
 * which has removed those types.
 *
 * Options:
 *
 *   - fastSkip: (default: true) returns the source directly if it doesn't find
 *               the word "async" in the source.
 *   - includeHelper: (default: true) includes the __async function in the file.
 */
module.exports = function asyncToGen(source, options) {
  // Cheap trick for files that don't actually contain async functions
  if (!(options && options.fastSkip === false) &&
      source.indexOf('async ') === -1) {
    return source;
  }

  // Babylon is one of the sources of truth for Flow syntax. This parse
  // configuration is intended to be as permissive as possible.
  var ast = babylon.parse(source, {
    allowImportExportEverywhere: true,
    allowReturnOutsideFunction: true,
    allowSuperOutsideMethod: true,
    sourceType: 'module',
    plugins: [ '*', 'jsx', 'flow' ],
  });

  ast.shouldIncludeHelper = !(options && options.includeHelper === false);

  var editor = new MagicString(source);

  visit(ast, editor, asyncToGenVisitor);

  return editor.toString();
}

var asyncHelper = "\nfunction __async(f){var g=f();return new Promise(function(s,j){c();function c(a,x){try{var r=g[x?'throw':'next'](a)}catch(e){return j(e)}if(r.done){s(r.value)}else{return Promise.resolve(r.value).then(c,function(e){return c(e,1)})}}})}\n";
module.exports.asyncHelper = asyncHelper;

// A collection of methods for each AST type names which contain Flow types to
// be removed.
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
        editor.insertRight(node.end, asyncHelper);
      }
    }
  },
  ThisExpression: {
    enter: function (editor, node, ast) {
      ast.scope[ast.scope.length - 1].referencesThis = true;
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
    editor.remove(node.start, node.start + 6);
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
// calling methods on the given visitor, providing context as the first argument.
function visit(ast, context, visitor) {
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
        visitFn && visitFn(context, node, ast);
      }
    } else {
      var node = parent ? parent[keys[index]] : ast.program;
      if (node && typeof node === 'object') {
        if (node.type) {
          var visitFn = visitor[node.type] && visitor[node.type].enter;
          if (visitFn && visitFn(context, node, ast) === false) {
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
