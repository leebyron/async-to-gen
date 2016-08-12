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

function __async(g){return new Promise(function(s,j){function c(a,x){try{var r=g[x?"throw":"next"](a)}catch(e){return j(e)}return r.done?s(r.value):Promise.resolve(r.value).then(c,d)}function d(e){return c(e,1)}c()})}
