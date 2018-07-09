import React from 'react'

const External = ({ href, children }) => (
  <a href={href} target="_blank" rel="nofollow external noopener noreferrer">{children}</a>
)

export default External