"use strict"

// async function statement
async function foo() {
  return await x
}

// async function expression
var bar = async function() {
  await x
}

// async arrow functions with body
var arrow1 = async () => {
  await 42
}

// async arrow functions with expression
var arrow2 = async () =>
  await 42;

// async obj member function
var obj = {
  async baz() {
    await this.x
  }
}

// async class method
class Dog {
  async  woof() {
    await this.x
  }
}

// static async class method
class Cat {
  static  async  miau() {
    await this.x
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

class SuperDuper extends BaseClass {
  constructor(arg) {
    super(arg)
  }

  async barAsync() {
    const arg = super.arg()
    super.arg = super.arg()

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
