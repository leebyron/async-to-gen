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

// arrow function referencing this within function
async function within1() {
  async function within2() {
    return await (async () => await this)
  }
}
