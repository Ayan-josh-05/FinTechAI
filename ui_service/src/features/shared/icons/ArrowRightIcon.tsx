import React from 'react'

export const ArrowRightIcon: React.FC<{
  size?: number
  color?: string
  rotate?: boolean
}> = ({ size = 20, color = 'currentColor', rotate = false }) => (
  <svg
    width={size}
    height={size}
    fill={color}
    viewBox="0 0 20 20"
    style={rotate ? { transform: 'rotate(180deg)' } : {}}
  >
    <path
      fillRule="evenodd"
      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
      clipRule="evenodd"
    />
  </svg>
)
