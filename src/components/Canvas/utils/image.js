export const doesColorMatchAtIndex = ([r, g, b], image, index) => {
  return (
    image.data[index] === r && 
    image.data[index + 1] === g && 
    image.data[index + 2] === b
  )
}