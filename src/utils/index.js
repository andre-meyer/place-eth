export const range = (n) => Object.keys(Array(n).fill())

export const clamp = (value, min, max) => {
  if (value > max) {
    return max
  }
  if (value < min) {
    return min
  }
  return value
}

export const mod = (n, m) => ((n % m) + m) % m
