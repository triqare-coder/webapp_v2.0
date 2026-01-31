'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface ProgressRingProps {
  segments: Array<{ label: string; value: number; color: string }>
  total: number
  width?: number
  height?: number
  centerText?: string
}

export default function D3ProgressRing({
  segments,
  total,
  width = 200,
  height = 200,
  centerText
}: ProgressRingProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const radius = Math.min(width, height) / 2 - 20
    const innerRadius = radius * 0.7
    const g = svg.append('g').attr('transform', `translate(${width / 2}, ${height / 2})`)

    // Create pie generator
    const pie = d3.pie<{ label: string; value: number; color: string }>()
      .value(d => d.value)
      .sort(null)
      .padAngle(0.03)

    // Create arc generator
    const arc = d3.arc<d3.PieArcDatum<{ label: string; value: number; color: string }>>()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .cornerRadius(5)

    // Tooltip
    const tooltip = d3.select('body').append('div')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'rgba(0,0,0,0.8)')
      .style('color', 'white')
      .style('padding', '8px 12px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('z-index', '1000')

    // Draw arcs
    const arcs = g.selectAll('path')
      .data(pie(segments))
      .enter()
      .append('path')
      .attr('fill', d => d.data.color)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('transform', 'scale(1.05)')
        const pct = ((d.data.value / total) * 100).toFixed(1)
        tooltip.style('visibility', 'visible')
          .html(`<strong>${d.data.label}</strong><br/>${d.data.value} (${pct}%)`)
      })
      .on('mousemove', (event) => {
        tooltip.style('top', (event.pageY - 10) + 'px').style('left', (event.pageX + 10) + 'px')
      })
      .on('mouseout', function() {
        d3.select(this).attr('transform', 'scale(1)')
        tooltip.style('visibility', 'hidden')
      })

    // Animate arcs
    arcs.transition()
      .duration(750)
      .attrTween('d', function(d) {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d)
        return function(t) {
          return arc(interpolate(t)) || ''
        }
      })

    // Center text
    if (centerText) {
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.3em')
        .style('font-size', '12px')
        .style('fill', '#6B7280')
        .text(centerText)
    }

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', centerText ? '1em' : '0.35em')
      .style('font-size', '24px')
      .style('font-weight', 'bold')
      .style('fill', '#374151')
      .text(total)

    // Legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width / 2 - 50}, ${height - 15})`)

    segments.forEach((seg, i) => {
      const lg = legend.append('g')
        .attr('transform', `translate(${i * 70 - (segments.length - 1) * 35}, 0)`)

      lg.append('circle').attr('r', 5).attr('fill', seg.color)
      lg.append('text')
        .attr('x', 8)
        .attr('y', 4)
        .style('font-size', '10px')
        .style('fill', '#6B7280')
        .text(`${seg.label}: ${seg.value}`)
    })

    return () => { tooltip.remove() }
  }, [segments, total, width, height, centerText])

  return <svg ref={svgRef} width={width} height={height} />
}

