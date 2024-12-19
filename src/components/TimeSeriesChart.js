import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

const TimeSeriesChart = ({
  data,
  entities,
  entityColors,
  granularity,
  setVisibleTimeframe,
  onSelectionChange,
}) => {
  const svgRef = useRef();
  let selectedBar = null;
  let selectedSegment = null;

  useEffect(() => {
    if (!data || entities.length === 0 || !data.ngrams) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous renders

    const width = svg.node().getBoundingClientRect().width;
    const height = 800;
    const margin = { top: 20, right: 30, bottom: 80, left: 50 };

    // Filter and group data by granularity
    const formatDate = (date) => {
      const d = new Date(date);
      if (granularity === "months")
        return `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (granularity === "years") return `${d.getFullYear()}`;
      return d.toISOString().split("T")[0]; // Default to days
    };

    const filteredData = data.ngrams.filter((ngram) => {
      const isValidDate = ngram.date && !isNaN(Date.parse(ngram.date));
      const matchesEntity = entities
        .map((e) => e.toLowerCase())
        .includes(ngram.ngram_text.toLowerCase());
      return isValidDate && matchesEntity;
    });

    const dateEntityCounts = d3.rollup(
      filteredData,
      (v) => new Set(v.map((item) => item.article_id)).size,
      (d) => formatDate(d.date),
      (d) => d.ngram_text.toLowerCase()
    );

    const aggregatedData = Array.from(dateEntityCounts, ([date, entityMap]) => {
      const obj = { date: new Date(date) };
      entities.forEach((entity) => {
        obj[entity] = entityMap.get(entity.toLowerCase()) || 0;
      });
      return obj;
    });

    if (!aggregatedData || aggregatedData.length === 0) {
      console.error("No data available for chart.");
      return;
    }

    // Set up scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(aggregatedData, (d) => d.date))
      .range([margin.left, width - margin.right]);

    const yScale = d3
      .scaleLinear()
      .domain([
        0,
        d3.max(aggregatedData, (d) =>
          d3.sum(entities.map((entity) => d[entity]))
        ),
      ])
      .range([height - margin.bottom, margin.top]);

    const colorScale = d3
      .scaleOrdinal()
      .domain(entities)
      .range(entities.map((entity) => entityColors[entity] || "gray"));

    const stackGenerator = d3
      .stack()
      .keys(entities)
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);

    const stackedData = stackGenerator(aggregatedData);

    // Add clipping for elements outside the graph
    svg
      .append("defs")
      .append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("width", width - margin.left - margin.right)
      .attr("height", height - margin.top - margin.bottom);

    // Add axes
    const xAxisGroup = svg
      .append("g")
      .attr("transform", `translate(0, ${height - margin.bottom})`);

    const yAxisGroup = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .style("font-size", "14px")
      .call(d3.axisLeft(yScale));

    // Function to update x-axis and labels dynamically
    const updateXAxis = (xScale, granularity) => {
      let tickFormat;
      let tickCount;

      if (granularity === "years") {
        tickFormat = d3.timeFormat("%Y");
        tickCount = d3.timeYear.every(1);
      } else if (granularity === "months") {
        tickFormat = d3.timeFormat("%b %Y");
        tickCount = d3.timeMonth.every(1);
      } else {
        // Days granularity
        tickFormat = d3.timeFormat("%d %b %Y");
        tickCount = d3.timeDay.every(1);
      }

      // Apply ticks with full count
      const axis = d3
        .axisBottom(xScale)
        .ticks(tickCount)
        .tickFormat(tickFormat);

      // Adjust label visibility for days
      if (granularity === "days") {
        const allTicks = xScale.ticks(tickCount);
        const labelVisibilityThreshold = 30; // Number of ticks after which labels are reduced
        const labelInterval = Math.ceil(
          allTicks.length / labelVisibilityThreshold
        );

        axis.tickFormat((d, i) => {
          // Show labels only at intervals
          return i % labelInterval === 0 ? d3.timeFormat("%d %b %Y")(d) : "";
        });
      }

      xAxisGroup
        .call(axis)
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .style("font-size", `${Math.min(14, 8000 / aggregatedData.length)}px`);
    };

    // Add stacked bars with clipping
    const layers = svg
      .append("g")
      .attr("clip-path", "url(#clip)")
      .selectAll(".layer")
      .data(stackedData)
      .join("g")
      .attr("fill", (d) => colorScale(d.key));

    const calculateBarWidth = (xScale, tickCount) => {
      // Get all ticks from the scale
      const ticks = xScale.ticks(tickCount);
      // Calculate the width as the difference between two adjacent ticks
      if (ticks.length > 1) {
        return Math.max((xScale(ticks[1]) - xScale(ticks[0])) * 0.9, 1); // 90% of the space between ticks
      }
      return 1; // Fallback for edge cases
    };

    const updateBars = (xScale) => {
      const tickCount =
        granularity === "years"
          ? d3.timeYear.every(1)
          : granularity === "months"
          ? d3.timeMonth.every(1)
          : d3.timeDay.every(1);

      const barWidth = calculateBarWidth(xScale, tickCount);

      bars.attr("x", (d) => xScale(d.data.date)).attr("width", barWidth);
    };

    const bars = layers
      .selectAll("rect")
      .data((d) => d)
      .join("rect")
      .attr("x", (d) => xScale(d.data.date))
      .attr("y", (d) => yScale(d[1]))
      .attr("height", (d) => yScale(d[0]) - yScale(d[1]))
      .attr("stroke", "none") // Initially no stroke
      .on("click", (event, d) => handleBarClick(event, d));

    updateBars(xScale);

    const handleBarClick = (event, clickedData) => {
      const barData = clickedData.data;
      const segmentData = clickedData;

      if (selectedBar && selectedBar.date === barData.date) {
        if (selectedSegment === segmentData) {
          resetSelection(); // Deselect segment
        } else {
          resetSegmentHighlight(segmentData);
          selectedSegment = segmentData;
          onSelectionChange(selectedBar, selectedSegment); // Pass bar and segment
        }
      } else {
        resetSelection();
        selectedBar = { date: barData.date };

        // Highlight the selected bar
        layers
          .selectAll("rect")
          .filter((d) => d.data.date === barData.date)
          .attr("stroke", "white")
          .attr("stroke-width", 2);

        selectedSegment = null;
        onSelectionChange(selectedBar, null);
      }
    };

    // Reset functions
    const resetSelection = () => {
      selectedBar = null;
      selectedSegment = null;
      layers.selectAll("rect").attr("stroke", "none").attr("stroke-width", 0);
      onSelectionChange(null, null);
    };

    const resetSegmentHighlight = (segmentData) => {
      layers
        .selectAll("rect")
        .attr("stroke", (d) => (d === segmentData ? "white" : "none"))
        .attr("stroke-width", (d) => (d === segmentData ? 2 : 0));
    };

    // Click outside the chart to reset all highlights
    svg.on("click", (event) => {
      if (event.target.tagName === "svg") {
        resetSelection();
      }
    });

    // Zoom behavior
    const zoomExtents = {
      days: [0.5, 100],
      months: [0.5, 10],
      years: [0.5, 1],
    };

    const zoom = d3
      .zoom()
      .scaleExtent(zoomExtents[granularity] || [0.5, 10])
      .translateExtent([
        [margin.left, 0],
        [width - margin.right, height],
      ])
      .on("zoom", (event) => {
        const newXScale = event.transform.rescaleX(xScale);

        // Update x-axis and bars
        updateXAxis(newXScale, granularity);
        updateBars(newXScale);

        // Trigger setVisibleTimeframe with the new range
        const [start, end] = newXScale.domain();
        setVisibleTimeframe({
          start: start.toISOString(),
          end: end.toISOString(),
        });

        // Update x-axis title
        xAxisTitle.text(
          `${d3.timeFormat("%d %b %Y")(start)} - ${d3.timeFormat("%d %b %Y")(
            end
          )}`
        );
      });

    svg.call(zoom);

    // Add dynamic x-axis title with background
    const xAxisTitleBackground = svg
      .append("rect")
      .attr("x", width / 2 - 190)
      .attr("y", height - 800)
      .attr("width", 380)
      .attr("height", 40)
      .attr("fill", "white")
      .attr("opacity", 0.8);

    const xAxisTitle = svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height - 770)
      .style("font-size", "32px")
      .text(
        `${d3.timeFormat("%d %b %Y")(xScale.domain()[0])} - ${d3.timeFormat(
          "%d %b %Y"
        )(xScale.domain()[1])}`
      );

    updateXAxis(xScale, granularity);

    // Calculate legend background dimensions
    const legendWidth = 150;
    const legendHeight = entities.length * 20 + 10;
    const legendTextWrapWidth = 130;

    // Add legend background
    svg
      .append("rect")
      .attr("x", margin.left + 10)
      .attr("y", margin.top - 10)
      .attr("width", legendWidth)
      .attr("height", legendHeight + 15)
      .attr("fill", "white")
      .attr("opacity", 0.8);

    // Add legend
    const legend = svg
      .selectAll(".legend")
      .data(entities)
      .join("g")
      .attr(
        "transform",
        (d, i) => `translate(${margin.left + 20}, ${margin.top + i * 20})`
      );

    legend
      .append("rect")
      .attr("x", 0)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", (d) => colorScale(d));

    legend
      .append("text")
      .attr("x", 20)
      .attr("y", 12)
      .text((d) => d)
      .style("font-size", "16px")
      .call(wrapText, legendTextWrapWidth);

    function wrapText(textSelection, width) {
      textSelection.each(function (d) {
        const text = d3.select(this);
        const words = d.split(/\s+/).reverse(); // Split words
        let word;
        let line = [];
        let lineNumber = 0;
        const lineHeight = 1.2; // Line spacing
        const x = text.attr("x");
        const y = text.attr("y");
        let tspan = text.text(null).append("tspan").attr("x", x).attr("y", y);

        while ((word = words.pop())) {
          line.push(word);
          tspan.text(line.join(" "));
          if (tspan.node().getComputedTextLength() > width) {
            line.pop();
            tspan.text(line.join(" "));
            line = [word];
            tspan = text
              .append("tspan")
              .attr("x", x)
              .attr("y", y)
              .attr("dy", `${++lineNumber * lineHeight}em`)
              .text(word);
          }
        }
      });
    }
  }, [data, entities, entityColors, granularity]);

  return (
    <svg
      ref={svgRef}
      style={{ width: "95%", height: "800px" }}
      viewBox={`0 0 1200 800`}
    ></svg>
  );
};

export default TimeSeriesChart;
