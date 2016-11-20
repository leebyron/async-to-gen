"use strict";

// Throwing, catching and finally.

var events = [];
async function* getThrow() {
  async function* source() {
    try {
      yield await Promise.resolve(1);
      yield await Promise.resolve(2);
    } finally {
      events.push('source finally');
      throw new Error('Source Finally Error');
    }
  }

  var iter1 = source();
  try {
    for await (let val of iter1) {
      yield val;
      break;
    }
  } catch (e) {
    events.push('getThrow1 caught: ' + e);
  } finally {
    events.push('getThrow1 finally');
    events.push('getThrow1 iter: ' + JSON.stringify(await iter1.next()));
  }

  var iter2 = source();
  try {
    for await (let val of iter2) {
      yield val;
      throw new Error('Inner Error');
    }
  } finally {
    events.push('getThrow2 finally');
    events.push('getThrow2 iter: ' + JSON.stringify(await iter2.next()));
  }

  events.push('UNEXPECTED');
}

var collected = [];
forEach(getThrow(), function(val) {
  events.push('yielded: ' + JSON.stringify(val))
}).catch(function (e) {
  events.push('caught: ' + e);
}).then(function () {
  if (JSON.stringify(events) !== JSON.stringify([
    'yielded: {"value":1,"done":false}',
    'source finally',
    'getThrow1 caught: Error: Source Finally Error',
    'getThrow1 finally',
    'getThrow1 iter: {"done":true}',
    'yielded: {"value":1,"done":false}',
    'source finally',
    'getThrow2 finally',
    'getThrow2 iter: {"done":true}',
    'caught: Error: Inner Error'
  ])) {
    console.error(events);
    throw new Error('Unexpected sequence of events.');
  }
});

// Stream producing value.

async function* stream() {
  yield await 4;
  yield await 9;
  yield await 12;
}

async function* genAnswers() {
  var total = 0;
  for await (let val of stream()) {
    total += await val;
    yield total;
  }
}

function forEach(ai, fn) {
  return ai.next().then(function (r) {
    if (!r.done) {
      fn(r);
      return forEach(ai, fn);
    }
  });
}

var output = 0;
forEach(genAnswers(), function(val) { output += val.value }).then(function () {
  console.log(output);
});
