import React, { useState, useEffect } from "react";
import "./App.css";
import EntitySelector from "./components/EntitySelector";
import TimeSeriesChart from "./components/TimeSeriesChart";
import TimeSeriesFilter from "./components/TimeSeriesFilter";
import HeatMap from "./components/HeatMap";
import ArticleViewer from "./components/ArticleViewer";
import axios from "axios";

const App = () => {
  const [data, setData] = useState({ articles: [], ngrams: [] });
  const [loading, setLoading] = useState(true);
  const [selectedEntities, setSelectedEntities] = useState([]);
  const [entityColors, setEntityColors] = useState({});
  const [granularity, setGranularity] = useState("months");
  const [visibleTimeframe, setVisibleTimeframe] = useState(null);
  const [activeBarTimeframe, setActiveBarTimeframe] = useState(null);
  const [activeBar, setActiveBar] = useState(null);
  const [activeSegment, setActiveSegment] = useState(null);
  const [mode, setMode] = useState("Timeline"); 

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [articlesRes, ngramsRes] = await Promise.all([
          axios.get("http://127.0.0.1:5000/articles"),
          axios.get("http://127.0.0.1:5000/ngrams"),
        ]);
        console.log("Fetched articles data:", articlesRes.data);
        console.log("Fetched ngrams data:", ngramsRes.data);
        setData({ articles: articlesRes.data, ngrams: ngramsRes.data });
        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  const handleSelectionChange = (bar, segment) => {
    if (!bar && !segment) {
      setActiveBarTimeframe(null);
      setActiveBar(null);
      setActiveSegment(null);
      return;
    }

    if (bar) {
      const startDate = new Date(bar.date);
      let endDate = new Date(startDate);

      if (granularity === "months") {
        endDate = new Date(
          startDate.getFullYear(),
          startDate.getMonth() + 1,
          0
        );
      } else if (granularity === "years") {
        endDate = new Date(startDate.getFullYear(), 11, 31);
      }

      setActiveBarTimeframe({
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      });
      setActiveBar({
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      });
    }

    setActiveSegment(segment);
  };
  return (
    <div className="app-container">
      <div className="main-content">
        <h1>N-gram Entity Visualization</h1>

        {/* Mode Buttons */}
        <div className="mode-buttons">
          <button onClick={() => setMode("Timeline")}>Timeline Mode</button>
          <button onClick={() => setMode("Co-Occurrences")}>
            Co-Occurrences Mode
          </button>
        </div>

        {/* Entity Selector */}
        <EntitySelector
          data={data}
          selectedEntities={selectedEntities}
          setSelectedEntities={setSelectedEntities}
          entityColors={entityColors}
          setEntityColors={setEntityColors}
        />

        {/* Conditionally Render Components Based on Mode */}
        {mode === "Timeline" && (
          <>
            <TimeSeriesFilter
              granularity={granularity}
              setGranularity={setGranularity}
            />
            <TimeSeriesChart
              data={data}
              entities={selectedEntities}
              entityColors={entityColors}
              granularity={granularity}
              setVisibleTimeframe={setVisibleTimeframe}
              onSelectionChange={handleSelectionChange}
            />
          </>
        )}

        {mode === "Co-Occurrences" && (
          <HeatMap data={data} entities={selectedEntities} />
        )}
      </div>

      {/* Side Panel */}
      <div className="side-panel">
        <ArticleViewer
          data={data}
          selectedEntities={selectedEntities}
          visibleTimeframe={visibleTimeframe}
          activeBar={activeBarTimeframe}
          activeSegment={activeSegment}
        />
      </div>
    </div>
  );
};

export default App;
