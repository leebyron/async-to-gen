"use strict"

// async function statement
function foo() {return __async(function*(){
  return yield x
}())}

// async function expression
var bar = function() {return __async(function*(){
  yield x
}())}

// async gen function statement
function foo() {return __asyncGen(function*(){
  yield yield{__await: x}
}())}

// async gen function expression
var bar = function () {return __asyncGen(function*(){
  yield{__await: (yield x)}
}())}

// async arrow functions with body
var arrow1 = () => __async(function*(){
  yield 42
}())

// async arrow functions with expression
var arrow2 = () =>__async(function*(){
  return yield 42}());

// async function with minimal whitespace
var arrow3=()=>return __async(function*(){yield(42)}());

// async arrow IIFE
(() => __async(function*(){
  yield 42
}()))()

// crockford style IIFE
(function () {return __async(function*(){
  yield 42
}())}())

// async obj member function
var obj = {
  baz() {return __async(function*(){
    yield this.x
  }.call(this))},

   bazGen() {return __asyncGen(function*(){
    yield yield{__await: this.x}
  }.call(this))}
}

// async class method
class Dog {
  woof() {return __async(function*(){
    yield this.x
  }.call(this))}

   woofGen() {return __asyncGen(function*(){
    yield{__await: (yield this.x)};
  }.call(this))}
}

// static async class method
class Cat {
  static  miau() {return __async(function*(){
    yield this.x
  }.call(this))}

  static  woofGen() {return __asyncGen(function*(){
    yield yield{__await: this.x};
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

// normal function referencing arguments
function normalThis() {
  return arguments;
}

// async function referencing arguments
function asyncThis() {return __async(function*(arguments){
  return arguments;
}(arguments))}

// async arrow function referencing arguments
function within1() {return __async(function*(arguments){
  () => () =>__async(function*(arguments){ return arguments}(arguments))
}(arguments))}


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

// await gen on its own line
function ownLineGen() {return __asyncGen(function*(){
  yield{__await:
    someThing};
}())}

// for await
function mapStream(stream, mapper) {return __asyncGen(function*(){
  for (let $await1 of stream) {let item=yield{__await:$await1};
    yield yield{__await: mapper(item)};
  }
}())}

// doesn't break for holey destructuring (#22)
const [,holey] = [1,2,3]

function __async(g){return new Promise(function(s,j){function c(a,x){try{var r=g[x?"throw":"next"](a)}catch(e){return j(e)}return r.done?s(r.value):Promise.resolve(r.value).then(c,d)}function d(e){return c(e,1)}c()})}

function __asyncGen(g){var q=[],T=["next","throw","return"],I={};for(var i=0;i<3;i++){I[T[i]]=a.bind(0,i)}Symbol&&(Symbol.iterator&&(I[Symbol.iterator]=t),Symbol.asyncIterator&&(I[Symbol.asyncIterator]=t));function t(){return this}function a(t,v){return new Promise(function(s,j){q.push([s,j,v,t]);q.length===1&&c(v,t)})}function c(v,t){try{var r=g[T[t|0]](v),w=r.value&&r.value.__await;w?Promise.resolve(w).then(c,d):n(r,0)}catch(e){n(e,1)}}function d(e){c(e,1)}function n(r,s){q.shift()[s](r);q.length&&c(q[0][2],q[0][3])}return I}
