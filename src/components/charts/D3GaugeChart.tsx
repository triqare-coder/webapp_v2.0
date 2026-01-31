'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface GaugeChartProps {
  value: number
  min?: number
  max?: number
  label: string
  width?: number
  height?: number
  colors?: string[]
}

export default function D3GaugeChart({
  value,
  min = 0,
  max = 100,
  label,
  width = 200,
  height = 150,
  colors = ['#EF4444', '#F59E0B', '#10B981']
}: GaugeChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin = { top: 10, right: 10, bottom: 30, left: 10 }
    const chartWidth = width - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom
    const radius = Math.min(chartWidth, chartHeight * 2) / 2

    const g = svg
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height - margin.bottom})`)

    // Create arc generator
    const arc = d3.arc()
      .innerRadius(radius * 0.65)
      .outerRadius(radius)
      .startAngle(-Math.PI / 2)

    // Background arc
    g.append('path')
      .datum({ endAngle: Math.PI / 2 })
      .style('fill', '#E5E7EB')
      .attr('d', arc as any)

    // Create color gradient segments
    const colorScale = d3.scaleLinear<string>()
      .domain([min, (min + max) / 2, max])
      .range(colors)

    // Value arc
    const normalizedValue = Math.min(Math.max(value, min), max)
    const angleScale = d3.scaleLinear()
      .domain([min, max])
      .range([-Math.PI / 2, Math.PI / 2])

    g.append('path')
      .datum({ endAngle: angleScale(normalizedValue) })
      .style('fill', colorScale(normalizedValue))
      .attr('d', arc as any)
      .transition()
      .duration(750)
      .attrTween('d', function(d: any) {
        const interpolate = d3.interpolate(-Math.PI / 2, d.endAngle)
        return function(t) {
          d.endAngle = interpolate(t)
          return (arc as any)(d)
        }
      })

    // Center text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.5em')
      .style('font-size', '24px')
      .style('font-weight', 'bold')
      .style('fill', colorScale(normalizedValue))
      .text(`${Math.round(normalizedValue)}%`)

    // Label
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.5em')
      .style('font-size', '12px')
      .style('fill', '#6B7280')
      .text(label)

    // Min/Max labels
    g.append('text')
      .attr('x', -radius)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('fill', '#9CA3AF')
      .text(min.toString())

    g.append('text')
      .attr('x', radius)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('fill', '#9CA3AF')
      .text(max.toString())

  }, [value, min, max, label, width, height, colors])

  return <svg ref={svgRef} width={width} height={height} />
}

