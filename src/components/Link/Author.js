import React from 'react'

const Author = ({ href, children }) => (
  <a href={href} target="_blank" rel="author">{children}</a>
)

export default Author