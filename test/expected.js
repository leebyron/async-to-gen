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

// arrow function referencing this within function
function within1() {return __async(function*(){
  function within2() {return __async(function*(){
    return yield (() =>__async(function*(){ return yield this}.bind(this)))
  }.bind(this))}
})}

function __async(a){var P=Promise,d=a();return new P((a,e)=>{var b=(f,g)=>{try{var c=d[g?"throw":"next"](f)}catch(h){return e(h)}if(c.done)a(c.value);else return P.resolve(c.value).then(b,a=>b(a,1))};b()})}
