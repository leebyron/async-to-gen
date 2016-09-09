// @flow

async function genAnswer() {
  try {
    throw await
      true ?
        await
          arguments[0] :
        await
          99
  } catch (e) {
    return e;
  }
}

genAnswer(42).then(function (val) { console.log(val) });
