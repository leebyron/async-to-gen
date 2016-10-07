async function longLoop() {
  for (var i = 0; i < 1000000; i++) await undefined;
  return true;
}

longLoop().then(function (finished) {
  process.exit(finished ? 0 : 1)
});
