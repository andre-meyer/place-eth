const shuffle = (a) => {
  var j, x, i;
  for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      x = a[i];
      a[i] = a[j];
      a[j] = x;
  }
  return a;
}


const range = (n) => Object.keys(Array(n).fill())

const clamp = (value, min, max) => {
  if (value > max) {
    return max
  }
  if (value < min) {
    return min
  }
  return value
}

const mod = (n, m) => ((n % m) + m) % m


module.exports = {
  shuffle,
  range,
  clamp,
  mod,
}