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
};

function KodaNode({ data, selected }: { data: CustomNodeData; selected: boolean }) {
  const color = NODE_COLORS[data.nodeType] ?? "#8a847c";
  const isRepo = data.nodeType === "repository";
  const isDir = data.nodeType === "directory";
  const isDep = data.nodeType === "external_dependency";

  return (
    <div
      style={{
        background: selected
          ? `color-mix(in srgb, ${color} 20%, #1a1816)`
          : "#1a1816",
        border: `${selected ? "1.5px" : "1px"} solid ${selected ? color : `color-mix(in srgb, ${color} 60%, #2a2723)`}`,
        borderRadius: isRepo ? "6px" : isDir ? "4px" : "3px",
        padding: isRepo ? "8px 14px" : "4px 10px",
        minWidth: isRepo ? "120px" : "80px",
        maxWidth: "180px",
        fontFamily: "var(--font-ibm-plex-mono, monospace)",
        boxShadow: selected ? `0 0 8px color-mix(in srgb, ${color} 30%, transparent)` : "none",
        transition: "all 0.15s ease",
      }}
    >
      <div
        style={{
          fontSize: isRepo ? "11px" : "9px",
          fontWeight: isRepo ? 600 : 400,
          color: selected ? color : `color-mix(in srgb, ${color} 90%, #e6e2dc)`,
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

/**
 * Simple hierarchical layout: repo at top, dirs below, files below that,
 * external deps at the bottom. Uses breadth-first positioning.
 */
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
};

export function CodebaseGraphView({
  graph,
  onNodeSelect,
  selectedNodeId,
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

  const initialNodes: Node[] = useMemo(() => {
    // For large graphs, limit displayed nodes for readability
    // Show: repository, all directories (up to 50), files (up to 100), deps (up to 30)
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
        return counts[type] <= limit;
      })
      .map((node) => {
        const pos = positions.get(node.id) ?? { x: 0, y: 0 };
        const isSelected = node.id === selectedNodeId;
        const isConnected = connectedNodeIds.has(node.id);

        return {
          id: node.id,
          type: "koda",
          position: pos,
          data: {
            label: node.label,
            nodeType: node.type,
            metadata: node.metadata,
            selected: isSelected || isConnected,
          },
          style: {
            opacity: selectedNodeId && !isSelected && !isConnected ? 0.35 : 1,
          },
        };
      });
  }, [graph.nodes, positions, selectedNodeId, connectedNodeIds]);

  const initialEdges: Edge[] = useMemo(() => {
    const nodeIds = new Set(initialNodes.map((n) => n.id));
    return graph.edges
      .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
      .map((edge) => ({
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
          opacity:
            selectedNodeId &&
            edge.source !== selectedNodeId &&
            edge.target !== selectedNodeId
              ? 0.15
              : 0.8,
        },
        animated: edge.type === "imports",
        label: undefined,
      }));
  }, [graph.edges, initialNodes, selectedNodeId]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

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
            return NODE_COLORS[data?.nodeType ?? "file"] ?? "#8a847c";
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
