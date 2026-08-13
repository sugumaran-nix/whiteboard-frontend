export type DrawTool =
  | "pen" | "pencil" | "marker" | "highlighter"
  | "calligraphy" | "crayon" | "oil" | "watercolour" | "spray"
  | "eraser";

export type ShapeTool =
  | "line" | "arrow" | "rect" | "rect-rounded"
  | "ellipse" | "triangle" | "diamond";

export type UtilTool = "text" | "pan" | "select";

export type Tool = DrawTool | ShapeTool | UtilTool;

export interface Point { x: number; y: number; }

export interface TextData {
  text: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
}

export interface Stroke {
  strokeId: string;
  color: string;
  fillColor?: string;
  width: number;
  opacity: number;
  tool: Tool;
  points: Point[];
  authorId?: string;
  textData?: TextData;
  shapeEnd?: Point;
}

// Per-tool settings — each tool has fully independent state
export interface PenSettings    { color: string; width: number; opacity: number; }
export interface EraserSettings { width: number; }
export interface ShapeSettings  { color: string; fillColor?: string; width: number; opacity: number; }
export interface TextSettings   { color: string; fontSize: number; bold: boolean; italic: boolean; opacity: number; }

export interface RemoteUser { id: string; name: string; color: string; }

export interface CursorState extends RemoteUser {
  x: number; y: number; lastSeen: number;
}

// ---- Server -> Client ----
export type ServerMessage =
  | { type: "init"; clientId: string; color: string; name: string; strokes: Stroke[]; users: RemoteUser[]; userCount: number }
  | { type: "user_joined"; user: RemoteUser }
  | { type: "user_left"; id: string }
  | { type: "user_renamed"; id: string; name: string }
  | { type: "user_count"; count: number }
  | { type: "stroke_start"; id: string; strokeId: string; color: string; fillColor?: string; width: number; opacity: number; tool: Tool; point: Point; textData?: TextData }
  | { type: "stroke_point"; id: string; strokeId: string; point: Point }
  | { type: "stroke_end"; id: string; strokeId: string; shapeEnd?: Point }
  | { type: "clear"; id: string }
  | { type: "cursor"; id: string; x: number; y: number; name: string; color: string }
  | { type: "undo"; id: string; strokeId: string }
  | { type: "redo"; id: string; stroke: Stroke };

// ---- Client -> Server ----
export type ClientMessage =
  | { type: "stroke_start"; strokeId: string; color: string; fillColor?: string; width: number; opacity: number; tool: Tool; point: Point; textData?: TextData }
  | { type: "stroke_point"; strokeId: string; point: Point }
  | { type: "stroke_end"; strokeId: string; shapeEnd?: Point }
  | { type: "cursor"; x: number; y: number }
  | { type: "clear" }
  | { type: "set_name"; name: string }
  | { type: "undo"; strokeId: string }
  | { type: "redo"; stroke: Stroke };
