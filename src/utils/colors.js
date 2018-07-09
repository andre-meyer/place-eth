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