import React from 'react'

const External = ({ href, children, ...props }) => (
  <a href={href} target="_blank" rel="nofollow external noopener noreferrer" {...props}>{children}</a>
)

export default External