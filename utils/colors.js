const palette = [
  "#FFF",
  "#AAA",
  "#555",
  "#000",
  "#A00",
  "#F55",
  "#FA0",
  "#FF5",
  "#0A0",
  "#5F5",
  "#5FF",
  "#0AA",
  "#00A",
  "#55F",
  "#F5F",
  "#A0A"
]

const findColorNaive = (r, g, b) => {
  const normR = r >> 4
  const normG = g >> 4
  const normB = b >> 4

  const colors = [normR, normG, normB]

  const colorString = `#${colors.map((n) => n.toString(16)).join('').toUpperCase()}`

  const colorIndex = palette.indexOf(colorString)

  if (colorIndex < 0) {
    return findColorInPalette(r, g, b)
  }

  return colorIndex
}

const getColorForIndex = (i) => {
  if (!palette.hasOwnProperty(i)) {
    return '#fff'
  }

  return palette[i]
}

const getColorComponentsForIndex = (i) => {
  const hexColor = getColorForIndex(i).toLowerCase()


  return hexColor.substr(1).split('').map(hex => {
    const dec = parseInt(hex, 16)

    return dec | dec << 4
  })
}

const findColorInPalette = (targetR, targetG, targetB) => {
  let colorFound
  let colorDistance = 999999

  palette.forEach((color, index) => {
    const [r, g, b] = color.toLowerCase().substr(1).split('').map(n => parseInt(n, 16))

    const normR = r | r << 4
    const normG = g | g << 4
    const normB = b | b << 4

    const distance = Math.sqrt(
      (targetR - normR) ** 2 +
      (targetG - normG) ** 2 +
      (targetB - normB) ** 2
    )
    
    if (distance < colorDistance) {
      colorDistance = distance
      colorFound = index
    }
  })
  return colorFound
}

const getColors = () => {
  return palette
}

module.exports = {
  findColorInPalette,
  findColorNaive,
  getColorComponentsForIndex,
  getColorForIndex,
  getColors,
}