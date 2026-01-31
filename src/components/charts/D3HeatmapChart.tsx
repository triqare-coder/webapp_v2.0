'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface HeatmapData {
  day: number
  hour: number
  value: number
}

interface HeatmapChartProps {
  data: HeatmapData[]
  width?: number
  height?: number
  title?: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

export default function D3HeatmapChart({
  data,
  width = 600,
  height = 250,
  title = 'Activity Heatmap'
}: HeatmapChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin = { top: 30, right: 20, bottom: 30, left: 50 }
    const chartWidth = width - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom
    const cellWidth = chartWidth / 24
    const cellHeight = chartHeight / 7

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`)

    // Create color scale
    const maxValue = d3.max(data, d => d.value) || 10
    const colorScale = d3.scaleSequential(d3.interpolateBlues)
      .domain([0, maxValue])

    // Create tooltip
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

    // Draw cells
    g.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', d => d.hour * cellWidth)
      .attr('y', d => d.day * cellHeight)
      .attr('width', cellWidth - 2)
      .attr('height', cellHeight - 2)
      .attr('rx', 3)
      .style('fill', d => d.value > 0 ? colorScale(d.value) : '#F3F4F6')
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).style('stroke', '#3B82F6').style('stroke-width', 2)
        tooltip.style('visibility', 'visible')
          .html(`${DAYS[d.day]} ${d.hour}:00<br/><strong>${d.value} requests</strong>`)
      })
      .on('mousemove', function(event) {
        tooltip.style('top', (event.pageY - 10) + 'px')
          .style('left', (event.pageX + 10) + 'px')
      })
      .on('mouseout', function() {
        d3.select(this).style('stroke', 'none')
        tooltip.style('visibility', 'hidden')
      })

    // X-axis (hours)
    const hourLabels = [0, 6, 12, 18, 23]
    g.selectAll('.hour-label')
      .data(hourLabels)
      .enter()
      .append('text')
      .attr('x', d => d * cellWidth + cellWidth / 2)
      .attr('y', chartHeight + 15)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('fill', '#6B7280')
      .text(d => `${d}:00`)

    // Y-axis (days)
    g.selectAll('.day-label')
      .data(DAYS)
      .enter()
      .append('text')
      .attr('x', -8)
      .attr('y', (_, i) => i * cellHeight + cellHeight / 2 + 4)
      .attr('text-anchor', 'end')
      .style('font-size', '10px')
      .style('fill', '#6B7280')
      .text(d => d)

    // Title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 18)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', '600')
      .style('fill', '#374151')
      .text(title)

    return () => { tooltip.remove() }
  }, [data, width, height, title])

  return <svg ref={svgRef} width={width} height={height} />
}

