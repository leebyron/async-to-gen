// @flow

async function genAnswer() {
  try {
    throw await
      true ?
        await
          42 :
        await
          99
  } catch (e) {
    return e;
  }
}

genAnswer().then(function (val) { console.log(val) });
