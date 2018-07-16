import { palette } from './colorPalette16.json'

export const getColorForIndex = (i) => {
  if (!palette.hasOwnProperty(i)) {
    return '#fff'
  }

  return palette[i]
}

export const getColorComponentsForIndex = (i) => {
  const hexColor = getColorForIndex(i).toLowerCase()


  return hexColor.substr(1).split('').map(hex => {
    const dec = parseInt(hex, 16)

    return dec | dec << 4
  })
}

export const findColorInPalette = (targetR, targetG, targetB) => {
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

export const getColors = () => {
  return palette
}