var babylon = require('babylon');
var MagicString = require('magic-string');

/**
 * Given a string JavaScript source which contains async functions, return a
 * MagicString which has transformed generators.
 *
 * MagicString has two important functions that can be called: .toString() and
 * .generateMap() which returns a source map, as well as these properties:
 *
 *   - .isEdited: true when any functions were transformed.
 *   - .containsAsync: true when any async functions were transformed.
 *   - .containsAsyncGen: true when any async generator functions were transformed.
 *
 * Options:
 *
 *   - sourceMap: (default: false) collects data to produce a correct source map.
 *                 provide true if you plan on calling generateMap().
 *   - fastSkip: (default: true) returns the source directly if it doesn't find
 *               the word "async" in the source.
 *   - includeHelper: (default: true) includes the __async function in the file.
 */
module.exports = asyncToGen;
function asyncToGen(source, options) {
  var editor = new MagicString(source);
  editor.isEdited = false;
  editor.containsAsync = false;
  editor.containsAsyncGen = false;

  // Cheap trick for files that don't actually contain async functions
  if (!(options && options.fastSkip === false) &&
      source.indexOf('async') === -1) {
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

  editor.isEdited = Boolean(ast.containsAsync || ast.containsAsyncGen);
  editor.containsAsync = Boolean(ast.containsAsync);
  editor.containsAsyncGen = Boolean(ast.containsAsyncGen);

  return editor;
}

/**
 * A method which the Jest testing library looks for to process source code.
 */
module.exports.process = function process(source) {
  return String(asyncToGen(source));
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
          'j(e);'+
          'return' +
        '}' +
        'r.done?' +
          's(r.value):' +
          'Promise.resolve(r.value).then(c,d)' +
      '}' +
      'function d(e){' +
        'c(e,1)' +
      '}' +
      'c()' +
    '})' +
  '}';

module.exports.asyncHelper = asyncHelper;

/**
 * A helper function which accepts a generator function and returns an
 * Async Iterable based on invoking the generating and resolving an iteration
 * of Promises.
 *
 * Automatically included at the end of files containing async generator
 * functions, but also exported from this module for other uses.
 * See ./async-node for an example of another usage.
 */
var asyncGenHelper =
  'function __asyncGen(g){' +
    'var q=[],' +
        'T=["next","throw","return"],' +
        'I={};' +
    'for(var i=0;i<3;i++){' +
      'I[T[i]]=a.bind(0,i)' +
    '}' +
    'Symbol&&(' +
      'Symbol.iterator&&(I[Symbol.iterator]=t),' +
      'Symbol.asyncIterator&&(I[Symbol.asyncIterator]=t));' +
    'function t(){' +
      'return this' +
    '}' +
    'function a(t,v){' +
      'return new Promise(function(s,j){' +
        'q.push([s,j,v,t]);' +
        'q.length===1&&c(v,t)' +
      '})' +
    '}' +
    'function c(v,t){' +
      'try{' +
        'var r=g[T[t|0]](v),' +
            'w=r.value&&r.value.__await;' +
        'w?' +
          'Promise.resolve(w).then(c,d):' +
          'n(r,0)' +
      '}catch(e){' +
        'n(e,1)' +
      '}' +
    '}' +
    'function d(e){' +
      'c(e,1)' +
    '}' +
    'function n(r,s){' +
      'q.shift()[s](r);' +
      'q.length&&c(q[0][2],q[0][3])' +
    '}' +
    'return I' +
  '}';

module.exports.asyncGenHelper = asyncGenHelper;

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
      if (ast.shouldIncludeHelper) {
        if (ast.containsAsync) {
          editor.append('\n' + asyncHelper + '\n');
        }
        if (ast.containsAsyncGen) {
          editor.append('\n' + asyncGenHelper + '\n');
        }
      }
    }
  },
  ThisExpression: {
    enter: function (editor, node, ast) {
      var envRecord = currentScope(ast);
      if (envRecord.async) {
        envRecord.referencesThis = true;
      }
    }
  },
  Identifier: {
    enter: function (editor, node, ast) {
      if (node.name === 'arguments') {
        var envRecord = currentScope(ast);
        if (envRecord.async) {
          envRecord.referencesArgs = true;
        }
      }
    }
  },
  MemberExpression: {
    leave: leaveMemberExpression
  },
  AssignmentExpression: {
    leave: leaveAssignmentExpression
  },
  ForAwaitStatement: {
    leave: leaveForAwait
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

  var envRecord = currentScope(ast);
  if (envRecord.generator) {
    start += '{__await:';
    end += '}';
  } else if (node.loc.start.line !== node.argument.loc.start.line) {
    // unlike await, yield must not be followed by a new line
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
    if (node.generator) {
      ast.containsAsyncGen = true;
    } else {
      ast.containsAsync = true;
    }

    var idx = findTokenIndex(ast.tokens, node.start);
    while (ast.tokens[idx].value !== 'async') {
      idx++;
    }
    editor.remove(ast.tokens[idx].start, ast.tokens[idx + 1].start);

    if (node.generator) {
      while (ast.tokens[idx].value !== '*') {
        idx++;
      }
      editor.overwrite(ast.tokens[idx].start, ast.tokens[idx + 1].start, ' ');
    }

    var wrapping = createAsyncWrapping(node);
    editor.insertLeft(node.body.start + 1, 'return ' + wrapping[0]);
    editor.insertRight(node.body.end - 1, wrapping[1]);
  }
}

function enterArrowFunction(editor, node, ast) {
  if (node.async) {
    ast.scope.push(node);
  }
}

function leaveArrowFunction(editor, node, ast) {
  if (node.async) {
    if (node.generator) {
      ast.containsAsyncGen = true;
    } else {
      ast.containsAsync = true;
    }

    ast.scope.pop();
    var envRecord = currentScope(ast);
    envRecord.referencesThis |= node.referencesThis;
    envRecord.referencesArgs |= node.referencesArgs;
    envRecord.referencesSuper |= node.referencesSuper;
    envRecord.referencesSuperEq |= node.referencesSuperEq;

    var wrapping = createAsyncWrapping(node);

    var idx = findTokenIndex(ast.tokens, node.start);
    while (ast.tokens[idx].value !== 'async') {
      idx++;
    }
    editor.remove(ast.tokens[idx].start, ast.tokens[idx + 1].start);

    if (node.body.type === 'BlockStatement') {
      editor.overwrite(node.body.start, node.body.start + 1, wrapping[0]);
      editor.overwrite(node.body.end - 1, node.body.end, wrapping[1]);
    } else {
      var idx = findTokenIndex(ast.tokens, node.body.start) - 1;
      while (ast.tokens[idx].type.label !== '=>') {
        idx--;
      }
      editor.insertRight(ast.tokens[idx].end, wrapping[0]);
      editor.insertLeft(node.body.start, 'return ');
      editor.insertRight(node.body.end, wrapping[1]);
    }
  }
}

function createAsyncWrapping(node) {
  var argNames = [];
  var argValues = [];

  if (node.referencesThis) {
    argValues.push('this');
  }

  if (node.referencesArgs) {
    argNames.push('arguments');
    argValues.push('arguments');
  }

  if (node.type !== 'ArrowFunctionExpression') {
    if (node.referencesSuper) {
      argNames.push('$uper');
      argValues.push('p=>super[p]');
    }

    if (node.referencesSuperEq) {
      argNames.push('$uperEq');
      argValues.push('(p,v)=>(super[p]=v)');
    }
  }

  var helperName = node.generator ? '__asyncGen' : '__async';

  return [
    helperName + '(function*(' + argNames.join(',') + '){',
    (node.referencesThis ? '}.call(' : '}(') + argValues.join(',') + '))'
  ];
}

function leaveMemberExpression(editor, node, ast, stack) {
  // Only transform super member expressions.
  if (node.object.type !== 'Super') return;

  var contextNode = stack.parent;

  // Do not transform delete unary or left-hand-side expressions.
  if (
    contextNode.operator === 'delete' ||
    contextNode.type === 'AssignmentExpression' && contextNode.left === node
  ) return;

  // Only within transformed async function scopes.
  var envRecord = currentScope(ast);
  if (!envRecord.async) return;

  envRecord.referencesSuper = true;

  convertSuperMember(editor, node, ast);

  editor.overwrite(node.object.start, node.object.end, '$uper(');
  editor.insertLeft(node.end, ')');

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

function leaveAssignmentExpression(editor, node, ast, stack) {
  // Only transform super assignment expressions.
  var left = node.left;
  if (left.type !== 'MemberExpression' || left.object.type !== 'Super') return;

  // Only within transformed async function scopes.
  var envRecord = currentScope(ast);
  if (!envRecord.async) return;

  envRecord.referencesSuperEq = true;

  convertSuperMember(editor, left, ast);

  editor.overwrite(left.object.start, left.object.end, '$uperEq(');
  editor.insertLeft(node.end, ')')

  var idx = findTokenIndex(ast.tokens, left.end);
  while (ast.tokens[idx].type.label !== '=') {
    idx++;
  }
  editor.overwrite(ast.tokens[idx].start, ast.tokens[idx].end, ',');
}

function convertSuperMember(editor, node, ast) {
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
}

function leaveForAwait(editor, node, ast) {
  var idx = findTokenIndex(ast.tokens, node.start) + 1;
  while (ast.tokens[idx].value !== 'await') {
    idx++;
  }
  editor.remove(ast.tokens[idx].start, ast.tokens[idx + 1].start);

  var tmpName = '$await' + (ast.scope.length - 1);
  editor.move(node.left.start, node.left.end, node.body.start + 1);
  editor.insertLeft(node.left.end, '=yield{__await:' + tmpName + '};');
  editor.insertLeft(node.left.start, 'let ' + tmpName);
}

function currentScope(ast) {
  return ast.scope[ast.scope.length - 1];
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
      if (node && typeof node === 'object' && (node.type || node.length)) {
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
