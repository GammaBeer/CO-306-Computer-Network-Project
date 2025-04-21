import { useState, useEffect, useRef, useCallback } from 'react';
import { Heap } from 'heap-js';
import { Router, Package } from 'lucide-react';

function App() {
  const [network, setNetwork] = useState({
    nodes: [
      { id: 'A', x: 100, y: 100, label: 'Router A' },
      { id: 'B', x: 300, y: 100, label: 'Router B' },
      { id: 'C', x: 500, y: 100, label: 'Router C' },
      { id: 'D', x: 100, y: 300, label: 'Router D' },
      { id: 'E', x: 300, y: 300, label: 'Router E' },
      { id: 'F', x: 500, y: 300, label: 'Router F' }
    ],
    links: [
      { source: 'A', target: 'B', weight: 5 },
      { source: 'B', target: 'C', weight: 3 },
      { source: 'A', target: 'D', weight: 2 },
      { source: 'B', target: 'E', weight: 4 },
      { source: 'C', target: 'F', weight: 1 },
      { source: 'D', target: 'E', weight: 3 },
      { source: 'E', target: 'F', weight: 6 }
    ]
  });

  const [sourceNode, setSourceNode] = useState('A');
  const [destNode, setDestNode] = useState('F');
  const [algorithm, setAlgorithm] = useState('dijkstra'); 
  const [isSimulating, setIsSimulating] = useState(false);
  const [packetPosition, setPacketPosition] = useState(null);
  const [routingPath, setRoutingPath] = useState([]);
  const [routingTables, setRoutingTables] = useState({});
  const [simulationSpeed, setSimulationSpeed] = useState(1000); 
  const [currentStep, setCurrentStep] = useState(0);
  const [showRoutingTables, setShowRoutingTables] = useState(false);
  const [simulationSteps, setSimulationSteps] = useState([]);
  const [showSimulationLog, setShowSimulationLog] = useState(false);
  const [simulationLog, setSimulationLog] = useState([]);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [currentPathSegment, setCurrentPathSegment] = useState(0);
  
  const createAdjacencyList = useCallback(() => {
    const adjacencyList = {};
    network.nodes.forEach(node => {
      adjacencyList[node.id] = [];
    });

    network.links.forEach(link => {
      adjacencyList[link.source].push({ node: link.target, weight: link.weight });
      adjacencyList[link.target].push({ node: link.source, weight: link.weight }); 
    });

    return adjacencyList;
  }, [network]);

  
  const dijkstra = useCallback((start) => {
    const adjacencyList = createAdjacencyList();
    const nodes = network.nodes.map(n => n.id);  
    const distances = {};
    const previous = {};
    const steps = [];
    const log = [];
  
    
    const minHeap = new Heap((a, b) => a.priority - b.priority);
  
    for (let node of nodes) {
      distances[node] = node === start ? 0 : Infinity;
      previous[node] = null;
    }
  
    minHeap.push({ node: start, priority: 0 });
    log.push(`Starting Dijkstra's algorithm from node ${start}`);
    log.push("Initial distances: " + JSON.stringify(distances));
  
    while (!minHeap.isEmpty()) {
      const { node: currentNode, priority } = minHeap.pop();
  
      if (priority > distances[currentNode]) continue;
  
      log.push(`Visiting node ${currentNode} with distance ${distances[currentNode]}`);
      steps.push({
        currentNode,
        distances: { ...distances },
        previous: { ...previous },
      });
  
      for (let neighbor of adjacencyList[currentNode]) {
        const potentialDistance = distances[currentNode] + neighbor.weight;
        if (potentialDistance < distances[neighbor.node]) {
          distances[neighbor.node] = potentialDistance;
          previous[neighbor.node] = currentNode;
          minHeap.push({ node: neighbor.node, priority: potentialDistance });
          log.push(`Updated distance to ${neighbor.node} via ${currentNode}: ${potentialDistance}`);
        }
      }
    }
  
    log.push("Final distances: " + JSON.stringify(distances));
    log.push("Final previous nodes: " + JSON.stringify(previous));
    return { distances, previous, steps, log };
  }, [network, createAdjacencyList]);
  const distanceVector = useCallback(() => {
    const adjacencyList = createAdjacencyList();
    const nodes = network.nodes.map(n => n.id);    
    const routingTables = {};
    const steps = [];
    const log = [];    
    for (let node of nodes) {
      routingTables[node] = {};
      for (let dest of nodes) {
        if (node === dest) {
          routingTables[node][dest] = { distance: 0, nextHop: node };
        } else {
          
          const directLink = adjacencyList[node].find(link => link.node === dest);
          if (directLink) {
            routingTables[node][dest] = { distance: directLink.weight, nextHop: dest };
          } else {
            routingTables[node][dest] = { distance: Infinity, nextHop: null };
          }
        }
      }
    }
    
    log.push("Initial routing tables:");
    for (let node of nodes) {
      log.push(`Node ${node}: ${JSON.stringify(routingTables[node])}`);
    }    
    steps.push({
      iteration: 0,
      routingTables: JSON.parse(JSON.stringify(routingTables))
    });
      
    let changed = true;
    let iteration = 0;
    const MAX_ITERATIONS = 20; 
    
    while (changed && iteration < MAX_ITERATIONS) {
      changed = false;
      iteration++;
      log.push(`Iteration ${iteration}:`);
      
      for (let node of nodes) {
        for (let neighbor of adjacencyList[node]) {
          const neighborNode = neighbor.node;
          const linkWeight = neighbor.weight;
                 
          for (let dest of nodes) {
            const currentDistance = routingTables[node][dest].distance;
            const distanceThroughNeighbor = linkWeight + routingTables[neighborNode][dest].distance;
            
            if (distanceThroughNeighbor < currentDistance) {
              routingTables[node][dest] = {
                distance: distanceThroughNeighbor,
                nextHop: neighborNode
              };
              changed = true;
              log.push(`Node ${node} updated route to ${dest} via ${neighborNode}: distance = ${distanceThroughNeighbor}`);
            }
          }
        }
      }
    
      steps.push({
        iteration,
        routingTables: JSON.parse(JSON.stringify(routingTables))
      });
      
      if (!changed) {
        log.push("Network has converged!");
      }
    }
    
    if (iteration === MAX_ITERATIONS) {
      log.push("Reached maximum iterations without convergence");
    }
    
    return { routingTables, steps, log };
  }, [network, createAdjacencyList]);  
  const calculatePath = useCallback((previous, start, end) => {
    const path = [];
    let current = end;
    
    while (current !== null) {
      path.unshift(current);
      current = previous[current];
    }
    
    if (path[0] !== start) {
      return []; 
    }    
    return path;
  }, []);
  
  const findNodeAtPosition = useCallback((x, y) => {
    const clickRadius = 20;
    return network.nodes.find(node => {
      const distance = Math.sqrt(Math.pow(node.x - x, y) + Math.pow(node.y - y, 2));
      return distance < clickRadius;
    });
  }, [network]);  
  const [draggedNode, setDraggedNode] = useState(null); 
  const handleMouseDown = (nodeId, e) => {
    setDraggedNode(nodeId);
  }; 
  const handleMouseMove = (e) => {
    if (draggedNode) {
      const svgRect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - svgRect.left;
      const y = e.clientY - svgRect.top;
      
      setNetwork(prev => ({
        ...prev,
        nodes: prev.nodes.map(node => 
          node.id === draggedNode ? { ...node, x, y } : node
        )
      }));
    }
  };  
  const handleMouseUp = () => {
    setDraggedNode(null);
  };  
  useEffect(() => {
    if (!isSimulating || currentStep >= routingPath.length || currentStep === 0) return;
    
    const sourceNodeId = routingPath[currentStep - 1];
    const targetNodeId = routingPath[currentStep];
    
    const sourceNode = network.nodes.find(n => n.id === sourceNodeId);
    const targetNode = network.nodes.find(n => n.id === targetNodeId);
    
    if (!sourceNode || !targetNode) return;
    
    
    const link = network.links.find(l => 
      (l.source === sourceNodeId && l.target === targetNodeId) || 
      (l.source === targetNodeId && l.target === sourceNodeId)
    );
    
    const animationDuration = simulationSpeed * (link ? link.weight : 1) / 5;
    const animationFrames = 60; 
    const frameDuration = animationDuration / animationFrames;
    
    setCurrentPathSegment(currentStep - 1);
    
    let frame = 0;
    const animate = () => {
      const progress = frame / animationFrames;
      setAnimationProgress(progress);
      
      
      const x = sourceNode.x + (targetNode.x - sourceNode.x) * progress;
      const y = sourceNode.y + (targetNode.y - sourceNode.y) * progress;
      setPacketPosition({ x, y });
      
      frame++;
      
      if (frame <= animationFrames) {
        setTimeout(animate, frameDuration);
      } else {
        
        setCurrentStep(prev => prev + 1);
      }
    };
    
    animate();
    
  }, [isSimulating, currentStep, routingPath, network, simulationSpeed]);
  const runSimulation = () => {
    setIsSimulating(true);
    setCurrentStep(0);
    setSimulationLog([]);
    
    let path, logEntries;
    
    if (algorithm === 'dijkstra') {
      const { previous, log } = dijkstra(sourceNode);
      path = calculatePath(previous, sourceNode, destNode);
      logEntries = log;
      setSimulationLog(log);
    } else {
      const { routingTables, log } = distanceVector();
      setRoutingTables(routingTables);
         
      path = [sourceNode];
      let current = sourceNode;
      
      while (current !== destNode) {
        const nextHop = routingTables[current][destNode].nextHop;
        if (!nextHop || nextHop === current) break;
        path.push(nextHop);
        current = nextHop;
      }     
      logEntries = log;
      setSimulationLog(log);
    }
    
    setRoutingPath(path);
    
    
    if (path.length > 0) {
      const startNode = network.nodes.find(n => n.id === path[0]);
      if (startNode) {
        setPacketPosition({ x: startNode.x, y: startNode.y });
      }
      
      setCurrentStep(1);
    }
    
    setSimulationSteps(path.map((node, index) => ({
      step: index,
      node,
      description: index === 0 
        ? `Packet leaves source router ${node}` 
        : index === path.length - 1 
          ? `Packet arrives at destination router ${node}`
          : `Packet forwarded through router ${node}`
    })));
  }; 
  useEffect(() => {
    if (!isSimulating || currentStep <= 0) return;
    
    
    if (currentStep >= routingPath.length) {
      setTimeout(() => {
        setIsSimulating(false);
      }, simulationSpeed);
    }
  }, [isSimulating, currentStep, routingPath, simulationSpeed]);
  const addRouter = () => {
    const newId = String.fromCharCode(65 + network.nodes.length);
    setNetwork(prev => ({
      ...prev,
      nodes: [...prev.nodes, { id: newId, x: 300, y: 200, label: `Router ${newId}` }]
    }));
  };  
  const [newLinkSource, setNewLinkSource] = useState('');
  const [newLinkTarget, setNewLinkTarget] = useState('');
  const [newLinkWeight, setNewLinkWeight] = useState(1);

  const addLink = () => {
    if (newLinkSource && newLinkTarget && newLinkSource !== newLinkTarget) {
      
      const linkExists = network.links.some(
        link => (link.source === newLinkSource && link.target === newLinkTarget) ||
               (link.source === newLinkTarget && link.target === newLinkSource)
      );
      
      if (!linkExists) {
        setNetwork(prev => ({
          ...prev,
          links: [...prev.links, { source: newLinkSource, target: newLinkTarget, weight: newLinkWeight }]
        }));
      }      
      setNewLinkSource('');
      setNewLinkTarget('');
      setNewLinkWeight(1);
    }
  };

  
  const resetSimulation = () => {
    setIsSimulating(false);
    setCurrentStep(0);
    setRoutingPath([]);
    setSimulationSteps([]);
    setAnimationProgress(0);
    setCurrentPathSegment(0);
  };

  return (
    <>
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-6">Network Packet Routing Simulator</h1>
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">Network Configuration</h2>
              <div className="space-y-2">
                <button 
                  onClick={addRouter} 
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Add Router
                </button>                
                <div className="flex items-center space-x-2">
                  <select 
                    value={newLinkSource} 
                    onChange={(e) => setNewLinkSource(e.target.value)}
                    className="border rounded p-2 w-24"
                  >
                    <option value="">Source</option>
                    {network.nodes.map(node => (
                      <option key={`source-${node.id}`} value={node.id}>{node.id}</option>
                    ))}
                  </select>                 
                  <span>to</span>
                  <select 
                    value={newLinkTarget} 
                    onChange={(e) => setNewLinkTarget(e.target.value)}
                    className="border rounded p-2 w-24"
                  >
                    <option value="">Target</option>
                    {network.nodes.map(node => (
                      <option key={`target-${node.id}`} value={node.id}>{node.id}</option>
                    ))}
                  </select>
                  
                  <input 
                    type="number" 
                    min="1" 
                    value={newLinkWeight} 
                    onChange={(e) => setNewLinkWeight(parseInt(e.target.value) || 1)}
                    className="border rounded p-2 w-16"
                    placeholder="Cost"
                  />                  
                  <button 
                    onClick={addLink} 
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    Add Link
                  </button>
                </div>
              </div>
            </div>           
            <div>
              <h2 className="text-lg font-semibold mb-2">Simulation Settings</h2>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label>Source:</label>
                  <select 
                    value={sourceNode} 
                    onChange={(e) => setSourceNode(e.target.value)}
                    className="border rounded p-2"
                  >
                    {network.nodes.map(node => (
                      <option key={`source-select-${node.id}`} value={node.id}>{node.id}</option>
                    ))}
                  </select>                 
                  <label>Destination:</label>
                  <select 
                    value={destNode} 
                    onChange={(e) => setDestNode(e.target.value)}
                    className="border rounded p-2"
                  >
                    {network.nodes.map(node => (
                      <option key={`dest-select-${node.id}`} value={node.id}>{node.id}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center space-x-2 flex-col">
                  <label>Protocol:</label>
                  <select 
                    value={algorithm} 
                    onChange={(e) => setAlgorithm(e.target.value)}
                    className="border rounded p-2"
                  >
                    <option value="dijkstra">OSPF (Dijkstra)</option>
                    <option value="distanceVector">RIP (Distance Vector)</option>
                  </select>
                  
                  <label>Speed:</label>
                  <input 
                    type="range" 
                    min="200" 
                    max="2000" 
                    step="100" 
                    value={simulationSpeed} 
                    onChange={(e) => setSimulationSpeed(parseInt(e.target.value))}
                    className="w-32"
                  />
                  <span>{simulationSpeed}ms</span>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">Actions</h2>
              <div className="space-x-2">
                <button 
                  onClick={runSimulation} 
                  disabled={isSimulating}
                  className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:bg-gray-400"
                >
                  Run Simulation
                </button> 
                <button 
                  onClick={resetSimulation} 
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Reset
                </button>
                
                <button 
                  onClick={() => setShowRoutingTables(!showRoutingTables)}
                  className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 mt-2"
                >
                  {showRoutingTables ? 'Hide' : 'Show'} Routing Tables
                </button>
                
                <button 
                  onClick={() => setShowSimulationLog(!showSimulationLog)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 mt-2"
                >
                  {showSimulationLog ? 'Hide' : 'Show'} Simulation Log
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="bg-white rounded-lg shadow-md p-4 flex-1">
            <h2 className="text-lg font-semibold mb-2">Network Topology</h2>
            <svg 
                width="600" 
                height="400" 
                className="border border-gray-300"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {network.links.map((link, idx) => {
                  const sourceNode = network.nodes.find(n => n.id === link.source);
                  const targetNode = network.nodes.find(n => n.id === link.target);
                  
                  if (!sourceNode || !targetNode) return null;
                  
                  const isRoutingLink = routingPath.length > 1 && routingPath.some((node, i) => {
                    if (i === routingPath.length - 1) return false;
                    return (node === link.source && routingPath[i + 1] === link.target) ||
                            (node === link.target && routingPath[i + 1] === link.source);
                  });
                  return (
                    <g key={`link-${idx}`}>
                      <line 
                        x1={sourceNode.x} 
                        y1={sourceNode.y} 
                        x2={targetNode.x} 
                        y2={targetNode.y} 
                        stroke={isRoutingLink ? "#ff6700" : "#999"}
                        strokeWidth={isRoutingLink ? 3 : 1}
                      />
                      <text 
                        x={(sourceNode.x + targetNode.x) / 2} 
                        y={(sourceNode.y + targetNode.y) / 2 - 10} 
                        fill="black" 
                        textAnchor="middle" 
                        fontSize="12"
                        className="bg-white"
                      >
                        {link.weight}
                      </text>
                    </g>
                  );
                })}
                
                {/* Nodes with Router icons */}
                {network.nodes.map(node => {
                  const isSource = node.id === sourceNode;
                  const isDest = node.id === destNode;
                  const isActive = routingPath[currentStep] === node.id;
                  const isInPath = routingPath.includes(node.id);
                  
                  let fillColor = "#ddd";
                  if (isSource) fillColor = "#4CAF50";
                  if (isDest) fillColor = "#F44336";
                  if (isActive) fillColor = "#2196F3";
                  if (isInPath && !isSource && !isDest && !isActive) fillColor = "#FFC107";
                  
                  return (
                    <g key={`node-${node.id}`}>
                      <circle 
                        cx={node.x} 
                        cy={node.y} 
                        r={isActive ? 18 : 15}
                        fill={fillColor} 
                        stroke={isActive ? "#0D47A1" : "#666"}
                        strokeWidth={isActive ? 3 : 1}
                        onMouseDown={(e) => handleMouseDown(node.id, e)}
                        style={{ cursor: 'move' }}
                      />
                      <text 
                        x={node.x} 
                        y={node.y + 5} 
                        textAnchor="middle" 
                        fill="#000" 
                        fontSize="14" 
                        fontWeight="bold"
                      >
                        {node.id}
                      </text>
                      
                      {/* Router icon at bottom right of the node */}
                      <foreignObject
                        x={node.x + 8} 
                        y={node.y + 8} 
                        width="20" 
                        height="20"
                        onMouseDown={(e) => handleMouseDown(node.id, e)}
                      >
                        <Router size={16} />
                      </foreignObject>
                    </g>
                  );
                })}
                
                {/* Animated Package along the path */}
                {isSimulating && currentPathSegment < routingPath.length - 1 && (
                  <foreignObject
                    x={packetPosition.x - 12}
                    y={packetPosition.y - 12}
                    width="24"
                    height="24"
                  >
                    <Package size={24} color="#03A9F4" />
                  </foreignObject>
                )}
              </svg>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 w-full md:w-96">
            <h2 className="text-lg font-semibold mb-2">Simulation Status</h2>
            <div className="mb-4">
              <p>
                <strong>Protocol:</strong> {algorithm === 'dijkstra' ? 'OSPF (Dijkstra)' : 'RIP (Distance Vector)'}
              </p>
              <p>
                <strong>Source:</strong> Router {sourceNode}
              </p>
              <p>
                <strong>Destination:</strong> Router {destNode}
              </p>
              <p>
                <strong>Status:</strong> {isSimulating ? `Step ${currentStep}/${routingPath.length}` : 'Ready'}
              </p>
            </div>
            {simulationSteps.length > 0 && (
              <div>
                <h3 className="font-semibold mb-1">Path:</h3>
                <div className="max-h-48 overflow-y-auto border p-2 rounded">
                  {simulationSteps.map((step, idx) => (
                    <div 
                      key={`step-${idx}`} 
                      className={`p-2 ${idx === currentStep - 1 ? 'bg-blue-100 font-semibold' : ''}`}
                    >
                      {step.description}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {routingPath.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold">Routing Path:</h3>
                <p>{routingPath.join(' → ')}</p>
                {routingPath.length > 0 && routingPath[0] !== sourceNode && (
                  <p className="text-red-500">No valid path exists!</p>
                )}
              </div>
            )}
          </div>
        </div>
        {showRoutingTables && Object.keys(routingTables).length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 mt-6">
            <h2 className="text-lg font-semibold mb-2">Routing Tables</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.keys(routingTables).map(nodeId => (
                <div key={`table-${nodeId}`} className="border rounded p-2">
                  <h3 className="font-semibold mb-1">Router {nodeId}</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-1 text-left">Destination</th>
                        <th className="p-1 text-left">Distance</th>
                        <th className="p-1 text-left">Next Hop</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(routingTables[nodeId]).map(destId => (
                        <tr key={`route-${nodeId}-${destId}`}>
                          <td className="p-1">{destId}</td>
                          <td className="p-1">
                            {routingTables[nodeId][destId].distance === Infinity ? 
                              '∞' : routingTables[nodeId][destId].distance}
                          </td>
                          <td className="p-1">{routingTables[nodeId][destId].nextHop || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}
        {showSimulationLog && simulationLog.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 mt-6">
            <h2 className="text-lg font-semibold mb-2">Simulation Log</h2>
            <div className="max-h-64 overflow-y-auto border rounded p-2 font-mono text-sm">
              {simulationLog.map((entry, idx) => (
                <div key={`log-${idx}`} className="py-1">
                  {entry}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  )
}

export default App
