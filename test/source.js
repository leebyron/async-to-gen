"use strict"

// async function statement
async function foo() {
  return await x
}

// async function expression
var bar = async function() {
  await x
}

// async gen function statement
async function* foo() {
  yield await x
}

// async gen function expression
var bar = async function* () {
  await (yield x)
}

// async arrow functions with body
var arrow1 = async () => {
  await 42
}

// async arrow functions with expression
var arrow2 = async () =>
  await 42;

// async function with minimal whitespace
var arrow3=async()=>await(42);

// double async functions with minimal whitespace
var arrow3=async()=>await(async()=>await 42);

// async arrow IIFE
(async () => {
  await 42
})();

// crockford style IIFE
(async function () {
  await 42
}());

// async obj member function
var obj = {
  async baz() {
    await this.x
  },

  async* bazGen() {
    yield await this.x
  }
}

// async class method
class Dog {
  async  woof() {
    await this.x
  }

  async* woofGen() {
    await (yield this.x);
  }
}

// static async class method
class Cat {
  static  async  miau() {
    await this.x
  }

  static async* woofGen() {
    yield await this.x;
  }
}

// normal function referencing this
function normalThis() {
  return this;
}

// async function referencing this
async function asyncThis() {
  return this;
}

// async arrow function referencing this
var fn = async () =>
  this;

var fn2 = /**/ async /**/ ( /**/ ) /**/ => /**/
 /**/ this /**/ ;

// async arrow function referencing this within async function
async function within1() {
  async function within2() {
    return await (async () => await this)
  }
}

// async arrow function referencing this within normal function
function within1() {
  function within2() {
    return async () =>
      this
  }
}

// normal arrow function referencing this within async function
function within1() {
  async function within2() {
    return () => this
  }
}

// normal arrow function referencing this deep within async function
async function within1() {
  function within2() {
    return () => this
  }
}

// async arrow inside normal arrow inside async function
async function within1() {
  () => async () => this
}

// normal function referencing arguments
function normalThis() {
  return arguments;
}

// async function referencing arguments
async function asyncThis() {
  return arguments;
}

// async arrow function referencing arguments
async function within1() {
  () => async () => arguments
}


class SuperDuper extends BaseClass {
  constructor(arg) {
    super(arg)
  }

  async barAsync() {
    const arg = super.arg()
    super.arg = super.arg()
    super.arg = super[super.arg = super.arg()]

    super /*a*/ . /*b*/ arg /*c*/ = /*d*/ super /*e*/ . /*f*/ arg /*g*/
    super /*a*/ [ /*b*/ arg /*c*/ ] /*d*/ = /*e*/ super /*f*/ [ /*g*/ arg /*h*/ ] /*i*/

    const arg = super['arg']
    super['arg'] = arg
    delete super.arg
    return super[arg](arg)

    delete super.arg
    return super.barAsync(arg)
  }

  async bazAsync() {
    super['arg'] = super['arg']
  }
}

// await and yield parse differences
async function requireParens() {
  await x || y;
  y && await x;
  await x + 1;
  await x << 5;
  await x | 0;
  0 | await x;
  await x == 3;
  4 !== await x;
  await x instanceof Foo;
  await x in await y;
  typeof await x;
  void await x;
  delete await x;
  !await x;
  ~await x;
  -await x;
  +await x;
  await x ? y : z;
}

// await and yield parse similarities
async function noRequiredParens() {
  await x;
  (await x, await x);
  await x++;
  return await x;
  throw await x;
  if (await x) return;
  while (await x) await x;
  do { await x } while (await x);
  for (y in await x) await y;
  for (y of await x) await y;
  x ? await y : await z;
  await await x;
}

// await on its own line
async function ownLine() {
  await
    someThing;
}

// await gen on its own line
async function* ownLineGen() {
  await
    someThing;
}

// for await
async function* mapStream(stream, mapper) {
  for await (let item of stream) {
    yield await mapper(item);
  }
}

async function reduceStream(stream, reducer, initial) {
  var value = initial;
  for await (let item of stream) {
    value = reducer(value, item);
  }
  return value;
}

// doesn't break for holey destructuring (#22)
const [,holey] = [1,2,3]

// support arrow functions returning parentheic expressions (#49)
const arrowOfParentheic = async () => (12345)
const arrowOfNestedDoubleParentheic = (async () => ((12345)))
const arrowOfSequence = async () => (12345, 67890)
const arrowOfObj1 = async () => ({})
const arrowOfObj2 = async () => ({
  key: await x
})
