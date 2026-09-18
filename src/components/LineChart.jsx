// Plotlyのような重い依存を入れず、正答率推移用の軽量SVG折れ線グラフ。
export function LineChart({ labels, values, height = 220 }) {
  const width = 600
  const padding = { top: 16, right: 16, bottom: 28, left: 34 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  const max = 100
  const stepX = labels.length > 1 ? innerW / (labels.length - 1) : 0
  const points = values.map((v, i) => {
    const x = padding.left + stepX * i
    const y = padding.top + innerH * (1 - v / max)
    return [x, y]
  })
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ')
  const gridYs = [0, 20, 40, 60, 80, 100]

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="正答率の推移">
      {gridYs.map((g) => {
        const y = padding.top + innerH * (1 - g / max)
        return (
          <g key={g}>
            <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e6e2d8" strokeWidth="1" />
            <text x={padding.left - 8} y={y + 4} fontSize="10" fill="#5c6270" textAnchor="end">
              {g}
            </text>
          </g>
        )
      })}
      {points.length > 1 && <path d={path} fill="none" stroke="#14213d" strokeWidth="2.5" />}
      {points.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="4.5" fill="#c9a15a" stroke="#14213d" strokeWidth="1.2" />
      ))}
      {labels.map((label, i) => (
        <text
          key={label}
          x={padding.left + stepX * i}
          y={height - 6}
          fontSize="10"
          fill="#5c6270"
          textAnchor="middle"
        >
          {label}
        </text>
      ))}
    </svg>
  )
}
