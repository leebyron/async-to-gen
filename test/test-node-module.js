// @flow

async function genAnswer() {
  try {
    throw await 42;
  } catch (e) {
    return e;
  }
}

genAnswer().then(function (val) { console.log(val) });
