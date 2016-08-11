async-to-gen
============

[![npm](https://img.shields.io/npm/v/async-to-gen.svg?maxAge=86400)](https://www.npmjs.com/package/async-to-gen)
[![Build Status](https://img.shields.io/travis/leebyron/async-to-gen.svg?style=flat&label=travis&branch=master)](https://travis-ci.org/leebyron/async-to-gen)

Turn your JavaScript with [async functions](https://github.com/tc39/ecmascript-asyncawait) into ES6 generators so they can be used in modern
browsers or in node.js (v0.12 or newer).

Async functions are an exciting new proposed addition to JavaScript. The v8 team
is [hard at work](https://bugs.chromium.org/p/v8/issues/detail?id=4483) getting it right, which means it could appear in future versions of node.js. However if
you're impatient like me, then you probably just can't wait to get rid of your
promise triangles and [callback hell](http://callbackhell.com/).

You can use [Babel](https://babeljs.io/) to accomplish this, but `async-to-gen`
is a faster, simpler, zero-configuration alternative with minimal dependencies
for super-fast `npm install` and transform time.


## Get Started!

Use the command line:

```
npm install --global async-to-gen
```

```
async-to-gen --help
async-to-gen input.js > output.js
```

Or the JavaScript API:

```
npm install async-to-gen
```

```js
var asyncToGen = require('async-to-gen');
var fs = require('fs');

var input = fs.readFileSync('input.js', 'utf8');
var output = asyncToGen(input);
fs.writeFileSync('output.js', output);
```


## Use `async-node`

Wherever you use `node` you can substitute `async-node` and have a super fast
async functions aware evaluator or REPL.

```
$ async-node
> async function answer() {
... return await 42
... }
undefined
> promise = answer()
Promise { <pending> }
> promise.then(console.log)
Promise { <pending> }
42
```


## Use the require hook

Using the require hook allows you to automatically compile files on the fly when
requiring in node:

```js
require('async-to-gen/register')
require('./some-module-with-async-functions')
```


## Dead-Simple Transforms

When `async-to-gen` transforms async functions, it does not affect the location
of lines in a file, leading to easier to understand stack traces when debugging.

It also includes a very small (236 byte) conversion function at the bottom of the file.

**Before:**

```js
async function foo() {
  return await x
}
```

**After:**

```js
function foo() {return __async(function*(){
  return yield x
})}

function __async(f){/* small helper function */}
```
