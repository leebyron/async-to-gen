// async function statement
function foo() {return __async(function*(){
  return yield x
})}

// async function expression
var bar = function() {return __async(function*(){
  yield x
})}

// async arrow functions with body
var arrow1 = () => __async(function*(){
  yield 42
})

// async arrow functions with expression
var arrow2 = () =>__async(function*(){
  return yield 42});

// async obj member function
var obj = {
  baz() {return __async(function*(){
    yield this.x
  }.bind(this))}
}

// async class method
class Dog {
  woof() {return __async(function*(){
    yield this.x
  }.bind(this))}
}

// static async class method
class Cat {
  static  miau() {return __async(function*(){
    yield this.x
  }.bind(this))}
}

// arrow function referencing this within function
function within1() {return __async(function*(){
  function within2() {return __async(function*(){
    return yield (() =>__async(function*(){ return yield this}.bind(this)))
  }.bind(this))}
})}

function __async(f){var g=f();return new Promise(function(s,j){function c(a,x){try{var r=g[x?"throw":"next"](a)}catch(e){return j(e)}return r.done?s(r.value):Promise.resolve(r.value).then(c,d)}function d(e){return c(e,1)}c()})}
