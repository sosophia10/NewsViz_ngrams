import React, { useState, useEffect } from "react";

const EntitySelector = ({
  data,
  selectedEntities,
  setSelectedEntities,
  entityColors,
  setEntityColors,
}) => {
  const [entityCounts, setEntityCounts] = useState({});
  const [inputValue, setInputValue] = useState("");

  const calculateEntityCounts = () => {
    if (!data || !data.ngrams) {
      console.error("Ngrams data is unavailable.");
      return;
    }

    const counts = {};
    data.ngrams.forEach((ngram) => {
      const text = ngram.ngram_text.toLowerCase();
      if (!counts[text]) {
        counts[text] = new Set();
      }
      counts[text].add(ngram.article_id); // Track unique article IDs
    });

    // Convert sets to counts
    const articleCounts = {};
    for (const [ngramText, articles] of Object.entries(counts)) {
      articleCounts[ngramText] = articles.size;
    }

    setEntityCounts(articleCounts);
  };

  const handleAddEntity = () => {
    if (inputValue.trim() && !selectedEntities.includes(inputValue.trim())) {
      setSelectedEntities([...selectedEntities, inputValue.trim()]);
      setEntityColors({ ...entityColors, [inputValue.trim()]: "#000000" }); // Default color: Black
    }
    setInputValue("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddEntity();
    }
  };

  const handleRemoveEntity = (entity) => {
    setSelectedEntities(selectedEntities.filter((e) => e !== entity));
    const updatedColors = { ...entityColors };
    delete updatedColors[entity];
    setEntityColors(updatedColors);
  };

  useEffect(() => {
    calculateEntityCounts();
  }, [data]);

  const handleColorChange = (entity, color) => {
    setEntityColors({ ...entityColors, [entity]: color });
  };

  return (
    <div>
      <h3>Entity Selector</h3>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress} //for 'Enter' upon selection
        placeholder="Enter 1-3 word entity"
      />
      <button onClick={handleAddEntity}>Add Entity</button>
      <ul>
        <h3>Occurrences in Articles</h3>
        {selectedEntities.map((entity, index) => (
          <li key={index}>
            {entity} (
            {entityCounts[entity.toLowerCase()] !== undefined
              ? `${entityCounts[entity.toLowerCase()]} articles`
              : "None"}
            )
            <input
              type="color"
              value={entityColors[entity]}
              onChange={(e) => handleColorChange(entity, e.target.value)}
            />
            <button onClick={() => handleRemoveEntity(entity)}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EntitySelector;
