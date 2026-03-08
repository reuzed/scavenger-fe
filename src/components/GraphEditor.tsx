import { useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Clue, Room } from "../types";

const clueNodeType = "clue";
const infoNodeType = "info";

type ClueNodeData = { label: string; isExit?: boolean };
type InfoNodeData = { label: string };
type ClueNodeType = Node<ClueNodeData, typeof clueNodeType>;
type InfoNodeType = Node<InfoNodeData, typeof infoNodeType>;

function ClueNode({ data, selected }: NodeProps<ClueNodeType>) {
  return (
    <div
      className={`relative rounded border-2 px-3 py-2 text-sm ${
        selected ? "border-amber-600 bg-amber-50" : "border-stone-400 bg-white"
      } ${data.isExit ? "ring-2 ring-amber-400" : ""}`}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !-left-1 !border-2" />
      <span className="font-medium">{data.label}</span>
      {data.isExit && <span className="ml-1 text-amber-600">(exit)</span>}
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !-right-1 !border-2" />
    </div>
  );
}

function InfoNode({ data, selected }: NodeProps<InfoNodeType>) {
  return (
    <div
      className={`relative rounded border-2 border-dashed px-3 py-2 text-sm ${
        selected ? "border-amber-600 bg-amber-50" : "border-stone-400 bg-stone-50"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !-left-1 !border-2" />
      <span className="font-medium">{data.label}</span>
      <span className="ml-1 text-stone-500">(info)</span>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  [clueNodeType]: ClueNode,
  [infoNodeType]: InfoNode,
} as NodeTypes;

function cluesToFlow(clues: Record<string, Clue>): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const clueList = Object.values(clues).sort((a, b) => a.name.localeCompare(b.name));
  const cols = 3;
  clueList.forEach((c, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const isInfo = c.is_info ?? false;
    nodes.push({
      id: c.id,
      type: isInfo ? infoNodeType : clueNodeType,
      position: { x: col * 180, y: row * 80 },
      data: {
        label: c.name,
        isExit: c.is_room_exit,
      },
    });
    c.dependencies.forEach((dep) => {
      edges.push({
        id: `${dep}-${c.id}`,
        source: dep,
        target: c.id,
        markerEnd: { type: MarkerType.ArrowClosed },
        type: "smoothstep",
      });
    });
  });
  return { nodes, edges };
}

interface GraphEditorProps {
  clues: Record<string, Clue>;
  rooms: Room[];
  selectedGroupId: string | null;
  updateGroupClues: (updater: (clues: Record<string, Clue>) => Record<string, Clue>) => void;
  selectedClueId: string | null;
  onSelectClue: (id: string | null) => void;
  selectedEdgeId: string | null;
  onSelectEdge: (id: string | null) => void;
  onUploadImage: (file: File) => Promise<{ key: string; url: string }>;
}

export default function GraphEditor({
  clues,
  rooms,
  selectedGroupId,
  updateGroupClues,
  selectedClueId: _selectedClueId,
  onSelectClue,
  selectedEdgeId: _selectedEdgeId,
  onSelectEdge,
}: GraphEditorProps) {
  const { nodes: initialNodes, edges: initialEdges } = cluesToFlow(clues);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    const { nodes: n, edges: e } = cluesToFlow(clues);
    setNodes((prev) => {
      const byId = new Map(prev.map((p) => [p.id, p]));
      return n.map((node) => ({
        ...node,
        position: byId.get(node.id)?.position ?? node.position,
      }));
    });
    setEdges(e.map((ed) => ({
      ...ed,
      markerEnd: { type: MarkerType.ArrowClosed },
      type: "smoothstep",
    })));
  }, [clues]);

  const isValidConnection = useCallback(
    (conn: Connection | Edge) => {
      const connection = conn as Connection;
      if (!connection.source || !connection.target || connection.source === connection.target) return false;
      // Info nodes can only have incoming edges (no outgoing)
      const source = clues[connection.source];
      return !source?.is_info;
    },
    [clues]
  );

  const onConnect = useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target || conn.source === conn.target) return;
      const target = clues[conn.target];
      if (!target) return;
      const deps = [...new Set([...target.dependencies, conn.source])];
      updateGroupClues((c) => ({
        ...c,
        [conn.target!]: { ...target, dependencies: deps },
      }));
      setEdges((eds) =>
        addEdge(
          {
            ...conn,
            markerEnd: { type: MarkerType.ArrowClosed },
            type: "smoothstep",
          },
          eds
        )
      );
    },
    [clues, updateGroupClues, setEdges]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectClue(node.id);
      onSelectEdge(null);
    },
    [onSelectClue, onSelectEdge]
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      onSelectEdge(edge.id);
      onSelectClue(null);
    },
    [onSelectEdge, onSelectClue]
  );

  const onPaneClick = useCallback(() => {
    onSelectClue(null);
    onSelectEdge(null);
  }, [onSelectClue, onSelectEdge]);

  const addClue = () => {
    const room = rooms[0];
    const id = `c${Date.now()}`;
    const clue: Clue = {
      id,
      name: `Clue ${Object.keys(clues).length + 1}`,
      room_id: room?.id ?? "r1",
      text: "",
      image_keys: [],
      dependencies: [],
      answer_config: {
        match_type: "case_insensitive",
        allowed_answers: [],
        max_edit_distance: 2,
        wrong_answer_messages: {},
        default_wrong_message: "That's not quite right. Try again!",
      },
      is_room_exit: false,
    };
    updateGroupClues((c) => ({ ...c, [id]: clue }));
    onSelectClue(id);
  };

  const addInfo = () => {
    const room = rooms[0];
    const id = `i${Date.now()}`;
    const clue: Clue = {
      id,
      name: `Info ${Object.keys(clues).length + 1}`,
      room_id: room?.id ?? "r1",
      text: "",
      image_keys: [],
      dependencies: [],
      answer_config: {
        match_type: "case_insensitive",
        allowed_answers: [],
        max_edit_distance: 2,
        wrong_answer_messages: {},
        default_wrong_message: "",
      },
      is_room_exit: false,
      is_info: true,
    };
    updateGroupClues((c) => ({ ...c, [id]: clue }));
    onSelectClue(id);
  };

  const defaultEdgeOptions = {
    markerEnd: { type: MarkerType.ArrowClosed },
    type: "smoothstep" as const,
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 border-b border-stone-300 bg-white px-3 py-2">
        <button
          onClick={addClue}
          disabled={!selectedGroupId}
          className="rounded bg-stone-700 px-3 py-1.5 text-sm text-white hover:bg-stone-800 disabled:opacity-50"
        >
          + Add clue
        </button>
        <button
          onClick={addInfo}
          disabled={!selectedGroupId}
          className="rounded border border-stone-400 bg-white px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-100 disabled:opacity-50"
        >
          + Add information
        </button>
        <span className="text-sm text-stone-500">
          {selectedGroupId
            ? "Drag from one node to another to add a dependency. Click an edge to view it."
            : "Select a group to add clues."}
        </span>
      </div>
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          isValidConnection={isValidConnection}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          className="bg-stone-50"
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
