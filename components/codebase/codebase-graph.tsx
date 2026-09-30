"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type NodeTypes,
  type Connection,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { CodebaseGraph, GraphNode } from "@/types/graph";
import type { ArchitectureReport } from "@/types/architecture";

// ─── Custom Node Colors ──────────────────────────────────────────────────────

const NODE_COLORS: Record<string, string> = {
  repository: "#c4956a",
  directory: "#7a9e87",
  file: "#8a847c",
  external_dependency: "#7a8ec4",
  function: "#b07cc6",
  class: "#c4956a",
  module: "#c4956a",
  api: "#e0905a",
  database: "#6ab8c4",
};

// ─── Custom Node Component ────────────────────────────────────────────────────

type CustomNodeData = {
  label: string;
  nodeType: string;
  metadata?: Record<string, unknown>;
  selected?: boolean;
  highlightColor?: string | null;
};

function KodaNode({ data, selected }: { data: CustomNodeData; selected: boolean }) {
  const color = data.highlightColor || NODE_COLORS[data.nodeType] || "#8a847c";
  const isRepo = data.nodeType === "repository";
  const isDir = data.nodeType === "directory";
  const isDep = data.nodeType === "external_dependency";

  return (
    <div
      style={{
        background: selected || data.highlightColor
          ? `color-mix(in srgb, ${color} 20%, #1a1816)`
          : "#1a1816",
        border: `${selected || data.highlightColor ? "1.5px" : "1px"} solid ${selected || data.highlightColor ? color : `color-mix(in srgb, ${color} 60%, #2a2723)`}`,
        borderRadius: isRepo ? "6px" : isDir ? "4px" : "3px",
        padding: isRepo ? "8px 14px" : "4px 10px",
        minWidth: isRepo ? "120px" : "80px",
        maxWidth: "180px",
        fontFamily: "var(--font-ibm-plex-mono, monospace)",
        boxShadow: selected || data.highlightColor ? `0 0 8px color-mix(in srgb, ${color} 30%, transparent)` : "none",
        transition: "all 0.15s ease",
      }}
    >
      <div
        style={{
          fontSize: isRepo ? "11px" : "9px",
          fontWeight: isRepo ? 600 : 400,
          color: selected || data.highlightColor ? color : `color-mix(in srgb, ${color} 90%, #e6e2dc)`,
          letterSpacing: isRepo ? "0.05em" : "0",
          textTransform: isRepo ? "uppercase" : "none",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {isDep && <span style={{ opacity: 0.6, fontSize: "8px", marginRight: "3px" }}>pkg</span>}
        {isDir && <span style={{ opacity: 0.6, fontSize: "8px", marginRight: "3px" }}>dir</span>}
        {data.label.length > 20 ? `${data.label.slice(0, 18)}…` : data.label}
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  koda: KodaNode as NodeTypes["koda"],
};

// ─── Layout Algorithm ─────────────────────────────────────────────────────────

function computeLayout(graphNodes: GraphNode[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  const byType: Record<string, GraphNode[]> = {
    repository: [],
    directory: [],
    file: [],
    external_dependency: [],
  };

  for (const node of graphNodes) {
    const bucket = byType[node.type] ?? byType["file"];
    bucket?.push(node);
  }

  const LAYER_Y: Record<string, number> = {
    repository: 0,
    directory: 120,
    file: 260,
    external_dependency: 420,
  };

  const HORIZONTAL_SPACING = 160;
  const MAX_PER_ROW = 8;

  for (const [type, nodes] of Object.entries(byType)) {
    const y = LAYER_Y[type] ?? 500;
    const totalWidth = Math.min(nodes.length, MAX_PER_ROW) * HORIZONTAL_SPACING;
    const startX = -totalWidth / 2;

    nodes.forEach((node, i) => {
      const row = Math.floor(i / MAX_PER_ROW);
      const col = i % MAX_PER_ROW;
      positions.set(node.id, {
        x: startX + col * HORIZONTAL_SPACING,
        y: y + row * 80,
      });
    });
  }

  return positions;
}

// ─── Main Component ──────────────────────────────────────────────────────────

type CodebaseGraphViewProps = {
  graph: CodebaseGraph;
  onNodeSelect: (nodeId: string | null) => void;
  selectedNodeId?: string | null;
  archReport?: ArchitectureReport | null;
  selectedModule?: string | null;
};

export function CodebaseGraphView({
  graph,
  onNodeSelect,
  selectedNodeId,
  archReport,
  selectedModule,
}: CodebaseGraphViewProps) {
  const positions = useMemo(() => computeLayout(graph.nodes), [graph.nodes]);

  // Identify connected nodes for highlighting
  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const connected = new Set<string>();
    for (const edge of graph.edges) {
      if (edge.source === selectedNodeId) connected.add(edge.target);
      if (edge.target === selectedNodeId) connected.add(edge.source);
    }
    return connected;
  }, [selectedNodeId, graph.edges]);

  // Precompute semantic highlights
  const { highlightedPaths, highlightColorMap } = useMemo(() => {
    const highlightedPaths = new Set<string>();
    const highlightColorMap = new Map<string, string>();

    if (!archReport) return { highlightedPaths, highlightColorMap };

    // Entry points
    if (!selectedModule) {
      archReport.entryPoints.forEach(ep => {
        highlightedPaths.add(ep.path);
        highlightColorMap.set(ep.path, "#e0905a"); // Accent for entry points
      });
    }

    // Selected module
    if (selectedModule) {
      const archModule = archReport.modules.find(m => m.name === selectedModule);
      if (archModule) {
        archModule.paths.forEach(p => {
          highlightedPaths.add(p);
          highlightColorMap.set(p, "#c4956a"); // Accent for module files
        });
      }
    }

    return { highlightedPaths, highlightColorMap };
  }, [archReport, selectedModule]);

  const initialNodes: Node[] = useMemo(() => {
    // For large graphs, limit displayed nodes for readability
    const limits: Record<string, number> = {
      repository: Infinity,
      directory: 50,
      file: 100,
      external_dependency: 30,
    };
    const counts: Record<string, number> = {};

    return graph.nodes
      .filter((node) => {
        const type = node.type;
        const limit = limits[type] ?? 50;
        counts[type] = (counts[type] ?? 0) + 1;
        
        // Ensure highlighted nodes are always included
        if (node.type === "file" && node.metadata?.path) {
          const path = node.metadata.path as string;
          if (highlightedPaths.has(path) || (selectedModule && path.startsWith(selectedModule))) {
            return true;
          }
        }
        
        return counts[type] <= limit;
      })
      .map((node) => {
        const pos = positions.get(node.id) ?? { x: 0, y: 0 };
        const isSelected = node.id === selectedNodeId;
        const isConnected = connectedNodeIds.has(node.id);
        
        let nodeHighlightColor = null;
        let isSemanticallyHighlighted = false;
        if (node.type === "file" && node.metadata?.path) {
          const path = node.metadata.path as string;
          if (highlightColorMap.has(path)) {
            nodeHighlightColor = highlightColorMap.get(path)!;
            isSemanticallyHighlighted = true;
          } else if (selectedModule) {
            // Check if it's within the module directory as fallback
            const isWithinModule = archReport?.modules.find(m => m.name === selectedModule)?.paths.some(p => path.startsWith(p));
            if (isWithinModule) {
               nodeHighlightColor = "#c4956a";
               isSemanticallyHighlighted = true;
            }
          }
        }

        const opacity = selectedNodeId 
          ? (isSelected || isConnected ? 1 : 0.35)
          : (selectedModule ? (isSemanticallyHighlighted ? 1 : 0.2) : 1);

        return {
          id: node.id,
          type: "koda",
          position: pos,
          data: {
            label: node.label,
            nodeType: node.type,
            metadata: node.metadata,
            selected: isSelected || isConnected,
            highlightColor: nodeHighlightColor,
          },
          style: { opacity },
        };
      });
  }, [graph.nodes, positions, selectedNodeId, connectedNodeIds, highlightedPaths, highlightColorMap, selectedModule, archReport]);

  const initialEdges: Edge[] = useMemo(() => {
    const nodeIds = new Set(initialNodes.map((n) => n.id));
    return graph.edges
      .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
      .map((edge) => {
        const isConnectedToSelected = selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId);
        
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: "default",
          style: {
            stroke:
              edge.type === "imports"
                ? "#c4956a"
                : edge.type === "depends_on"
                  ? "#7a8ec4"
                  : "#3d3832",
            strokeWidth: edge.type === "contains" ? 1 : 1.5,
            opacity: selectedNodeId 
              ? (isConnectedToSelected ? 0.8 : 0.15)
              : (selectedModule ? 0.15 : 0.8),
          },
          animated: edge.type === "imports",
          label: undefined,
        };
      });
  }, [graph.edges, initialNodes, selectedNodeId, selectedModule]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when initial data changes
  useMemo(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useMemo(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeSelect(node.id === selectedNodeId ? null : node.id);
    },
    [onNodeSelect, selectedNodeId]
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  return (
    <div style={{ width: "100%", height: "100%", background: "#0c0b0a" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1.5 }}
        minZoom={0.1}
        maxZoom={3}
        defaultEdgeOptions={{ type: "default" }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#2a2723"
        />
        <Controls
          style={{
            background: "#131210",
            border: "1px solid #2a2723",
            borderRadius: "4px",
          }}
        />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as CustomNodeData;
            return data.highlightColor || (NODE_COLORS[data?.nodeType ?? "file"] ?? "#8a847c");
          }}
          style={{
            background: "#0c0b0a",
            border: "1px solid #2a2723",
          }}
          maskColor="rgba(0,0,0,0.6)"
        />
      </ReactFlow>
    </div>
  );
}
