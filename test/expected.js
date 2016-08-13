"use strict"

// async function statement
function foo() {return __async(function*(){
  return yield x
}())}

// async function expression
var bar = function() {return __async(function*(){
  yield x
}())}

// async arrow functions with body
var arrow1 = () => __async(function*(){
  yield 42
}())

// async arrow functions with expression
var arrow2 = () =>__async(function*(){
  return yield 42}());

// async obj member function
var obj = {
  baz() {return __async(function*(){
    yield this.x
  }.call(this))}
}

// async class method
class Dog {
  woof() {return __async(function*(){
    yield this.x
  }.call(this))}
}

// static async class method
class Cat {
  static  miau() {return __async(function*(){
    yield this.x
  }.call(this))}
}

// normal function referencing this
function normalThis() {
  return this;
}

// async function referencing this
function asyncThis() {return __async(function*(){
  return this;
}.call(this))}

// async arrow function referencing this
var fn = () =>__async(function*(){
  return this}.call(this));

var fn2 = /**/ /**/ ( /**/ ) /**/ =>__async(function*(){ /**/
 /**/ return this}.call(this)) /**/ ;

// async arrow function referencing this within async function
function within1() {return __async(function*(){
  function within2() {return __async(function*(){
    return yield (() =>__async(function*(){ return yield this}.call(this)))
  }.call(this))}
}())}

// async arrow function referencing this within normal function
function within1() {
  function within2() {
    return () =>__async(function*(){
      return this}.call(this))
  }
}

// normal arrow function referencing this within async function
function within1() {
  function within2() {return __async(function*(){
    return () => this
  }.call(this))}
}

// normal arrow function referencing this deep within async function
function within1() {return __async(function*(){
  function within2() {
    return () => this
  }
}())}

// async arrow inside normal arrow inside async function
function within1() {return __async(function*(){
  () => () =>__async(function*(){ return this}.call(this))
}.call(this))}

class SuperDuper extends BaseClass {
  constructor(arg) {
    super(arg)
  }

  barAsync() {return __async(function*($uper,$uperEq){
    const arg = $uper("arg").call(this)
    $uperEq("arg" , $uper("arg").call(this))

    $uperEq( /*a*/  /*b*/ "arg" /*c*/ , /*d*/ $uper( /*e*/  /*f*/ "arg")) /*g*/
    $uperEq( /*a*/  /*b*/ arg /*c*/  /*d*/ , /*e*/ $uper( /*f*/  /*g*/ arg /*h*/ )) /*i*/

    const arg = $uper('arg')
    $uperEq('arg' , arg)
    delete super.arg
    return $uper(arg).call(this,arg)

    delete super.arg
    return $uper("barAsync").call(this,arg)
  }.call(this,p=>super[p],(p,v)=>(super[p]=v)))}

  bazAsync() {return __async(function*($uper,$uperEq){
    $uperEq('arg' , $uper('arg'))
  }(p=>super[p],(p,v)=>(super[p]=v)))}
}

// await and yield parse differences
function requireParens() {return __async(function*(){
  (yield x) || y;
  y && (yield x);
  (yield x) + 1;
  (yield x) << 5;
  (yield x) | 0;
  0 | (yield x);
  (yield x) == 3;
  4 !== (yield x);
  (yield x) instanceof Foo;
  (yield x) in (yield y);
  typeof (yield x);
  void (yield x);
  delete (yield x);
  !(yield x);
  ~(yield x);
  -(yield x);
  +(yield x);
  (yield x) ? y : z;
}())}

// await and yield parse similarities
function noRequiredParens() {return __async(function*(){
  yield x;
  (yield x, yield x);
  yield x++;
  return yield x;
  throw yield x;
  if (yield x) return;
  while (yield x) yield x;
  do { yield x } while (yield x);
  for (y in yield x) yield y;
  for (y of yield x) yield y;
  x ? yield y : yield z;
  yield yield x;
}())}

// await on its own line
function ownLine() {return __async(function*(){
  yield(
    someThing);
}())}

function __async(g){return new Promise(function(s,j){function c(a,x){try{var r=g[x?"throw":"next"](a)}catch(e){return j(e)}return r.done?s(r.value):Promise.resolve(r.value).then(c,d)}function d(e){return c(e,1)}c()})}
