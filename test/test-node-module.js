// @flow

async function genAnswer() {
  try {
    throw await
      true ?
        await
          Promise.resolve(arguments[0]) :
        await
          Promise.resolve(99)
  } catch (e) {
    return e;
  }
}

genAnswer(42).then(function (val) { console.log(val) });
