'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface TreemapData {
  name: string
  value: number
  color?: string
}

interface TreemapChartProps {
  data: TreemapData[]
  width?: number
  height?: number
  title?: string
}

export default function D3TreemapChart({
  data,
  width = 400,
  height = 250,
  title
}: TreemapChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !data.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const margin = { top: title ? 30 : 10, right: 10, bottom: 10, left: 10 }
    const chartWidth = width - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom

    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#14B8A6']

    // Create hierarchy
    const hierarchy = d3.hierarchy({ children: data } as any)
      .sum(d => (d as any).value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0))

    // Create treemap layout
    const treemap = d3.treemap<any>()
      .size([chartWidth, chartHeight])
      .padding(2)
      .round(true)

    const root = treemap(hierarchy)

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

    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`)

    // Draw cells
    const cells = g.selectAll('g')
      .data(root.leaves())
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.x0}, ${d.y0})`)

    cells.append('rect')
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('fill', (_, i) => data[i]?.color || colors[i % colors.length])
      .attr('rx', 4)
      .attr('opacity', 0.85)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('opacity', 1)
        const total = d3.sum(data, item => item.value)
        const pct = ((d.value || 0) / total * 100).toFixed(1)
        tooltip.style('visibility', 'visible')
          .html(`<strong>${(d.data as any).name}</strong><br/>${d.value} (${pct}%)`)
      })
      .on('mousemove', (event) => {
        tooltip.style('top', (event.pageY - 10) + 'px').style('left', (event.pageX + 10) + 'px')
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 0.85)
        tooltip.style('visibility', 'hidden')
      })

    // Add labels
    cells.append('text')
      .attr('x', 6)
      .attr('y', 18)
      .style('font-size', d => {
        const w = d.x1 - d.x0
        return w > 80 ? '12px' : w > 50 ? '10px' : '8px'
      })
      .style('fill', 'white')
      .style('font-weight', '500')
      .style('pointer-events', 'none')
      .text(d => {
        const w = d.x1 - d.x0
        const name = (d.data as any).name
        return w > 40 ? (name.length > w / 8 ? name.slice(0, Math.floor(w / 8)) + '..' : name) : ''
      })

    cells.append('text')
      .attr('x', 6)
      .attr('y', 32)
      .style('font-size', '10px')
      .style('fill', 'rgba(255,255,255,0.8)')
      .style('pointer-events', 'none')
      .text(d => (d.x1 - d.x0) > 50 ? d.value?.toString() || '' : '')

    // Title
    if (title) {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', 18)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', '600')
        .style('fill', '#374151')
        .text(title)
    }

    return () => { tooltip.remove() }
  }, [data, width, height, title])

  return <svg ref={svgRef} width={width} height={height} />
}

