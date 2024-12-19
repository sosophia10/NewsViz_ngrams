import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const HeatMap = ({ data, entities }) => {
  const svgRef = useRef();
  const [selectedCell, setSelectedCell] = useState(null);

  useEffect(() => {
    if (!data || !data.ngrams || entities.length < 2) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous renders

    const margin = { top: 50, right: 30, bottom: 50, left: 50 };
    const containerWidth = svgRef.current.parentElement.clientWidth;
    const cellSize = Math.max(30, containerWidth / entities.length);
    const width = containerWidth;
    const height = cellSize * entities.length + margin.top + margin.bottom;

    svg.attr("width", width).attr("height", height);

    // Filter n-grams to include only relevant ones
    const relevantNgrams = data.ngrams.filter((ngram) =>
      entities.includes(ngram.ngram_text.toLowerCase())
    );

    // Create a mapping of article IDs to the selected entities they contain
    const articleEntityMap = {};
    relevantNgrams.forEach((ngram) => {
      const articleId = ngram.article_id;
      const entity = ngram.ngram_text.toLowerCase();

      if (!articleEntityMap[articleId]) {
        articleEntityMap[articleId] = new Set();
      }
      articleEntityMap[articleId].add(entity);
    });

    // Calculate co-occurrence counts
    const coOccurrenceMatrix = entities.map((rowEntity) =>
      entities.map((colEntity) => {
        if (rowEntity === colEntity) return 0;

        return Object.values(articleEntityMap).reduce((count, entitySet) => {
          if (entitySet.has(rowEntity) && entitySet.has(colEntity)) {
            return count + 1;
          }
          return count;
        }, 0);
      })
    );

    // Flatten matrix for D3
    const flatMatrix = [];
    entities.forEach((rowEntity, i) => {
      entities.forEach((colEntity, j) => {
        flatMatrix.push({
          row: rowEntity,
          col: colEntity,
          value: coOccurrenceMatrix[i][j],
        });
      });
    });

    const xScale = d3
      .scaleBand()
      .domain(entities)
      .range([margin.left, width - margin.right])
      .padding(0.1);

    const yScale = d3
      .scaleBand()
      .domain([...entities].reverse())
      .range([margin.top, height - margin.bottom])
      .padding(0.1);

    const maxCount = d3.max(flatMatrix, (d) => d.value);
    const colorScale = d3
      .scaleSequential(d3.interpolateBlues)
      .domain([0, maxCount]);

    // Add tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.7)")
      .style("color", "white")
      .style("padding", "5px")
      .style("border-radius", "5px")
      .style("pointer-events", "none")
      .style("visibility", "hidden");

    // Draw X and Y axes
    svg
      .append("g")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).tickSize(0))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-0.8em")
      .attr("dy", "0.15em")
      .attr("transform", "rotate(-45)")
      .style("font-size", "16px");

    svg
      .append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(yScale).tickSize(0))
      .style("font-size", "16px");

    // Add heatmap cells
    const cells = svg
      .selectAll("rect")
      .data(flatMatrix)
      .join("rect")
      .attr("x", (d) => xScale(d.col))
      .attr("y", (d) => yScale(d.row))
      .attr("width", xScale.bandwidth())
      .attr("height", yScale.bandwidth())
      .attr("fill", (d) =>
        d.row === d.col ? "lightgrey" : colorScale(d.value)
      )
      .attr("opacity", (d) => (d.row === d.col ? 0.4 : 1))
      .attr("stroke", (d) =>
        selectedCell &&
        selectedCell.row === d.row &&
        selectedCell.col === d.col
          ? "white"
          : "none"
      )
      .attr("stroke-width", 2)
      .on("mouseover", (event, d) => {
        const totalArticles = Object.keys(articleEntityMap).length;
        const percentage = ((d.value / totalArticles) * 100).toFixed(2);

        tooltip
          .style("visibility", "visible")
          .html(
            `<strong>${d.row} & ${d.col}</strong><br>` +
              `Co-occurrence: ${d.value}<br>` +
              `Percentage: ${percentage}%`
          );
      })
      .on("mousemove", (event) => {
        tooltip
          .style("top", `${event.pageY - 10}px`)
          .style("left", `${event.pageX + 10}px`);
      })
      .on("mouseout", () => tooltip.style("visibility", "hidden"))
      .on("click", (event, d) => {
        if (
          selectedCell &&
          selectedCell.row === d.row &&
          selectedCell.col === d.col
        ) {
          setSelectedCell(null); // Deselect if clicking the same cell
        } else {
          setSelectedCell(d); // Select the clicked cell
        }
        // Ensure tooltip is hidden on click
        tooltip.style("visibility", "hidden");
      });

    // Reapply selection state
    if (selectedCell) {
      cells
        .filter(
          (d) => d.row === selectedCell.row && d.col === selectedCell.col
        )
        .attr("stroke", "white")
        .attr("stroke-width", 2);
    }
  }, [data, entities, selectedCell]);

  return (
    <div style={{ width: "100%" }}>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default HeatMap;
