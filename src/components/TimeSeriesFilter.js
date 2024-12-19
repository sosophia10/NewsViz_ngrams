import React from "react";

const TimeSeriesFilter = ({ granularity, setGranularity }) => {
  return (
    <div>
      <h3>Timeline Granularity</h3>
      <button onClick={() => setGranularity("days")}>Days</button>
      <button onClick={() => setGranularity("months")}>Months</button>
      <button onClick={() => setGranularity("years")}>Years</button>
    </div>
  );
};

export default TimeSeriesFilter;
