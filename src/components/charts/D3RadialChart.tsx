'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface RadialData {
  name: string
  value: number
  color?: string
}

interface RadialChartProps {
  data: RadialData[]
  width?: number
  height?: number
  innerRadius?: number
  title?: string
}

export default function D3RadialChart({
  data,
  width = 300,
  height = 300,
  innerRadius = 60,
  title
}: RadialChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !data.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const radius = Math.min(width, height) / 2 - 30
    const g = svg
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`)

    const maxValue = d3.max(data, d => d.value) || 100
    const angleScale = d3.scaleBand()
      .domain(data.map(d => d.name))
      .range([0, 2 * Math.PI])
      .padding(0.1)

    const radiusScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([innerRadius, radius])

    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

    // Draw bars
    const arc = d3.arc<RadialData>()
      .innerRadius(innerRadius)
      .outerRadius(d => radiusScale(d.value))
      .startAngle(d => angleScale(d.name) || 0)
      .endAngle(d => (angleScale(d.name) || 0) + angleScale.bandwidth())
      .padAngle(0.02)
      .cornerRadius(4)

    // Tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'd3-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', 'rgba(0,0,0,0.8)')
      .style('color', 'white')
      .style('padding', '8px 12px')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('z-index', '1000')

    g.selectAll('path')
      .data(data)
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', (d, i) => d.color || colors[i % colors.length])
      .attr('opacity', 0.85)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('opacity', 1).attr('transform', 'scale(1.05)')
        tooltip.style('visibility', 'visible')
          .html(`<strong>${d.name}</strong><br/>${d.value}`)
      })
      .on('mousemove', (event) => {
        tooltip.style('top', (event.pageY - 10) + 'px').style('left', (event.pageX + 10) + 'px')
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 0.85).attr('transform', 'scale(1)')
        tooltip.style('visibility', 'hidden')
      })
      .transition()
      .duration(750)
      .attrTween('d', function(d) {
        const i = d3.interpolate(0, d.value)
        return function(t) {
          return arc({ ...d, value: i(t) }) || ''
        }
      })

    // Labels
    g.selectAll('.label')
      .data(data)
      .enter()
      .append('text')
      .attr('transform', d => {
        const angle = (angleScale(d.name) || 0) + angleScale.bandwidth() / 2 - Math.PI / 2
        const r = radius + 15
        return `translate(${r * Math.cos(angle)}, ${r * Math.sin(angle)})`
      })
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .style('font-size', '10px')
      .style('fill', '#6B7280')
      .text(d => d.name.length > 8 ? d.name.slice(0, 8) + '..' : d.name)

    // Center text
    if (title) {
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.2em')
        .style('font-size', '14px')
        .style('font-weight', '600')
        .style('fill', '#374151')
        .text(title)
      
      const total = d3.sum(data, d => d.value)
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.2em')
        .style('font-size', '20px')
        .style('font-weight', 'bold')
        .style('fill', '#3B82F6')
        .text(total)
    }

    return () => { tooltip.remove() }
  }, [data, width, height, innerRadius, title])

  return <svg ref={svgRef} width={width} height={height} />
}

