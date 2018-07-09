export const eventToCanvasPos = (evt, ctx) => {
  const rect = ctx.canvas.getBoundingClientRect() // abs. size of element
  const scaleX = ctx.canvas.width / rect.width    // relationship bitmap vs. element for X
  const scaleY = ctx.canvas.height / rect.height  // relationship bitmap vs. element for Y

  const mousePosition = {
    x: (evt.clientX - rect.left) * scaleX,   // scale mouse coordinates after they have
    y: (evt.clientY - rect.top) * scaleY     // been adjusted to be relative to element
  }

  return mousePosition
}