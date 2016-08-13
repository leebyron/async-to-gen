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
  'function __async(g){' +
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
    leave: leaveAwait
  },
  ArrowFunctionExpression: {
    enter: enterArrowFunction,
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
  },
  MemberExpression: {
    leave: leaveMemberExpression
  }
};

function leaveAwait(editor, node, ast, stack) {
  var start;
  var end;

  // An YieldExpression can only exist where AssignmentExpression is
  // allowed, otherwise it is wrapped in a ParenthesizedExpression.
  var parentType = stack.parent.type;

  if (parentType === 'LogicalExpression' ||
      parentType === 'BinaryExpression' ||
      parentType === 'UnaryExpression' ||
      parentType === 'ConditionalExpression' && node === stack.parent.test) {
    start = '(yield';
    end = ')';
  } else {
    start = 'yield';
    end = '';
  }

  // unlike await, yield must not be followed by a new line
  if (node.loc.start.line !== node.argument.loc.start.line) {
    start += '(';
    end += ')';
  }

  editor.overwrite(node.start, node.start + 5, start);
  if (end) {
    editor.insertLeft(node.end, end);
  }
}

function enterFunction(editor, node, ast) {
  ast.scope.push(node);
}

function leaveFunction(editor, node, ast) {
  ast.scope.pop();
  if (node.async) {
    ast.isEdited = true;
    var idx = findTokenIndex(ast.tokens, node.start);
    while (ast.tokens[idx].value !== 'async') {
      idx++;
    }
    editor.remove(ast.tokens[idx].start, ast.tokens[idx + 1].start);

    var argNames = [];
    var argValues = [];
    if (node.referencesThis) {
      argValues.push('this');
    }
    if (node.referencesSuper) {
      argNames.push('$uper');
      argValues.push('p=>super[p]');
    }
    if (node.referencesSuperEq) {
      argNames.push('$uperEq');
      argValues.push('(p,v)=>(super[p]=v)');
    }

    editor.insertLeft(
      node.body.start + 1,
      'return __async(function*(' + argNames.join(',') + '){'
    );
    editor.insertRight(
      node.body.end - 1,
      (node.referencesThis ? '}.call(' : '}(') + argValues.join(',') + '))'
    );
  }
}

function enterArrowFunction(editor, node, ast) {
  if (node.async) {
    ast.scope.push(node);
  }
}

function leaveArrowFunction(editor, node, ast) {
  if (node.async) {
    ast.scope.pop();
    if (node.referencesThis) {
      ast.scope[ast.scope.length - 1].referencesThis = true;
    }
    if (node.referencesSuper) {
      ast.scope[ast.scope.length - 1].referencesSuper = true;
    }
    if (node.referencesSuperEq) {
      ast.scope[ast.scope.length - 1].referencesSuperEq = true;
    }
    ast.isEdited = true;
    editor.remove(node.start, node.start + 6);
    if (node.body.type === 'BlockStatement') {
      editor.overwrite(node.body.start, node.body.start + 1, '__async(function*(){');
      editor.overwrite(node.body.end - 1, node.body.end, node.referencesThis ? '}.call(this))' : '}())');
    } else {
      var idx = findTokenIndex(ast.tokens, node.body.start) - 1;
      while (ast.tokens[idx].type.label !== '=>') {
        idx--;
      }
      editor.insertRight(ast.tokens[idx].end, '__async(function*(){');
      editor.insertLeft(node.body.start, 'return ');
      editor.insertRight(node.body.end, node.referencesThis ? '}.call(this))' : '}())');
    }
  }
}

function leaveMemberExpression(editor, node, ast, stack) {
  // Only transform super member expressions.
  if (node.object.type !== 'Super') return;

  // Only within transformed async function scopes.
  var envRecord = ast.scope[ast.scope.length - 1];
  if (!envRecord.async) return;

  var contextNode = stack.parent;

  // Do not transform delete unary expressions.
  if (contextNode.operator === 'delete') return;

  // Convert member property to function argument
  var idx = findTokenIndex(ast.tokens, node.object.end);
  while (ast.tokens[idx].type.label !== (node.computed ? '[' : '.')) {
    idx++;
  }
  editor.remove(ast.tokens[idx].start, ast.tokens[idx].end);
  if (node.computed) {
    editor.remove(node.end - 1, node.end);
  } else {
    editor.insertRight(node.property.start, '"');
    editor.insertLeft(node.property.end, '"');
  }

  // super.prop = value
  if (contextNode.type === 'AssignmentExpression' && contextNode.left === node) {
    envRecord.referencesSuperEq = true;
    editor.overwrite(node.object.start, node.object.end, '$uperEq(');
    editor.insertRight(contextNode.end, ')')

    var idx = findTokenIndex(ast.tokens, node.end);
    while (ast.tokens[idx].type.label !== '=') {
      idx++;
    }
    editor.overwrite(ast.tokens[idx].start, ast.tokens[idx].end, ',');
  } else {
    envRecord.referencesSuper = true;
    editor.overwrite(node.object.start, node.object.end, '$uper(');
    editor.insertRight(node.end, ')');

    // Ensure super.prop() use the current this binding.
    if (contextNode.type === 'CallExpression') {
      envRecord.referencesThis = true;
      var idx = findTokenIndex(ast.tokens, node.end);
      while (ast.tokens[idx].type.label !== '(') {
        idx++;
      }
      editor.overwrite(ast.tokens[idx].start, ast.tokens[idx].end, contextNode.arguments.length ? '.call(this,' : '.call(this');
    }
  }
}

// Given the AST output of babylon parse, walk through in a depth-first order,
// calling methods on the given visitor, providing editor as the first argument.
function visit(ast, editor, visitor, sourceMap) {
  var stack;
  var parent = ast;
  var keys = ['program'];
  var index = -1;

  do {
    index++;
    if (stack && index === keys.length) {
      parent = stack.parent;
      keys = stack.keys;
      index = stack.index;
      var node = parent[keys[index]];
      if (node.type) {
        var visitFn = visitor[node.type] && visitor[node.type].leave;
        visitFn && visitFn(editor, node, ast, stack);
      }
      stack = stack.prev;
    } else {
      var node = parent[keys[index]];
      if (node && typeof node === 'object' && (node.type || node.length && node[0].type)) {
        stack = { parent: parent, keys: keys, index: index, prev: stack };
        parent = node;
        keys = Object.keys(node);
        index = -1;
        if (node.type) {
          if (sourceMap) {
            editor.addSourcemapLocation(node.start);
            editor.addSourcemapLocation(node.end);
          }
          var visitFn = visitor[node.type] && visitor[node.type].enter;
          visitFn && visitFn(editor, node, ast, stack);
        }
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

  return ptr;
}
