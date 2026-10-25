import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Pen, 
  Eraser, 
  Trash2, 
  Download, 
  Undo,
  Maximize2,
  Minimize2,
  Sparkles,
  Users
} from 'lucide-react';
import type { DrawStroke, DrawPoint, DrawCursor } from '../../shared/types.js';

interface DrawingViewProps {
  strokes: DrawStroke[];
  liveStrokes?: Record<string, DrawStroke>;
  remoteCursors: Record<string, DrawCursor>;
  onSendStroke: (stroke: DrawStroke) => void;
  onSendLiveStroke?: (strokeId: string, points: DrawPoint[], color: string, size: number, isEraser: boolean) => void;
  onSendCursor: (cursor: DrawCursor) => void;
  onClear: () => void;
  myUserId: string;
  myNickname: string;
  myColor: string;
  readOnly?: boolean;
}

const COLORS = [
  '#f8fafc', // White
  '#94a3b8', // Gray
  '#0f172a', // Dark slate
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#854d0e'  // Brown
];

const SIZES = [
  { label: 'Fino', val: 3 },
  { label: 'Médio', val: 6 },
  { label: 'Grosso', val: 12 },
  { label: 'Marcador', val: 24 }
];

export const DrawingView: React.FC<DrawingViewProps> = ({
  strokes,
  liveStrokes = {},
  remoteCursors,
  onSendStroke,
  onSendLiveStroke,
  onSendCursor,
  onClear,
  myUserId,
  myNickname,
  myColor,
  readOnly = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  const [activeTool, setActiveTool] = useState<'pen' | 'eraser'>('pen');
  const [activeColor, setActiveColor] = useState(myColor || '#3b82f6');
  const [brushSize, setBrushSize] = useState(6);
  const [isDrawing, setIsDrawing] = useState(false);

  // Active stroke ID and points
  const activeStrokeIdRef = useRef<string>('');
  const currentPointsRef = useRef<DrawPoint[]>([]);
  const lastCursorSendRef = useRef<number>(0);
  const lastLiveStrokeSendRef = useRef<number>(0);

  // Fixed internal coordinate system for perfect cross-device scaling
  const VIRTUAL_WIDTH = 1600;
  const VIRTUAL_HEIGHT = 1000;

  // Helper to draw a stroke using smooth quadratic Bezier curves
  const drawStrokePath = (ctx: CanvasRenderingContext2D, points: DrawPoint[], color: string, size: number, isEraser: boolean) => {
    if (points.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = size;
    ctx.strokeStyle = isEraser ? '#090d16' : color;

    if (points.length === 1) {
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = isEraser ? '#090d16' : color;
      ctx.fill();
      ctx.restore();
      return;
    }

    if (points.length === 2) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Smooth quadratic curves through midpoints for zero angular jitter
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
    }

    // Last point
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
    ctx.restore();
  };

  // Redraw full canvas from permanent strokes + live remote strokes + local in-progress stroke
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    // Dark drafting chalkboard background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    // Blueprint grid dots
    ctx.fillStyle = '#172033';
    for (let x = 30; x < VIRTUAL_WIDTH; x += 40) {
      for (let y = 30; y < VIRTUAL_HEIGHT; y += 40) {
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Render all saved permanent strokes
    strokes.forEach((stroke) => {
      drawStrokePath(ctx, stroke.points, stroke.color, stroke.size, stroke.isEraser);
    });

    // Render live strokes from remote users in real-time
    Object.values(liveStrokes).forEach((stroke) => {
      if (stroke.userId !== myUserId) {
        drawStrokePath(ctx, stroke.points, stroke.color, stroke.size, stroke.isEraser);
      }
    });

    // Render local user's in-progress stroke
    if (currentPointsRef.current.length > 0) {
      drawStrokePath(
        ctx,
        currentPointsRef.current,
        activeColor,
        brushSize,
        activeTool === 'eraser'
      );
    }
  }, [strokes, liveStrokes, activeColor, brushSize, activeTool, myUserId]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Convert client screen coordinates directly to virtual canvas coordinates
  const getVirtualCoords = (clientX: number, clientY: number): DrawPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const scaleX = VIRTUAL_WIDTH / rect.width;
    const scaleY = VIRTUAL_HEIGHT / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    return {
      x: Math.max(0, Math.min(VIRTUAL_WIDTH, x)),
      y: Math.max(0, Math.min(VIRTUAL_HEIGHT, y))
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    const coords = getVirtualCoords(e.clientX, e.clientY);
    if (!coords) return;

    setIsDrawing(true);
    activeStrokeIdRef.current = `strk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    currentPointsRef.current = [coords];

    // Send immediate cursor update
    onSendCursor({
      userId: myUserId,
      nickname: myNickname,
      color: myColor,
      x: coords.x,
      y: coords.y,
      isDrawing: true
    });
    lastCursorSendRef.current = Date.now();

    renderCanvas();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getVirtualCoords(e.clientX, e.clientY);
    if (!coords) return;

    const now = Date.now();

    // Throttled cursor broadcast (every ~30ms) to ensure smooth pointer sync
    if (!readOnly && now - lastCursorSendRef.current > 30) {
      onSendCursor({
        userId: myUserId,
        nickname: myNickname,
        color: myColor,
        x: coords.x,
        y: coords.y,
        isDrawing
      });
      lastCursorSendRef.current = now;
    }

    if (!isDrawing || readOnly) return;

    // Check minimum distance to avoid redundant micro-points
    const lastPt = currentPointsRef.current[currentPointsRef.current.length - 1];
    if (lastPt) {
      const dist = Math.hypot(coords.x - lastPt.x, coords.y - lastPt.y);
      if (dist < 1.5) return;
    }

    currentPointsRef.current.push(coords);

    // Fast local rendering of current points
    renderCanvas();

    // Throttled live stroke transmission to remote users
    if (onSendLiveStroke && now - lastLiveStrokeSendRef.current > 35) {
      onSendLiveStroke(
        activeStrokeIdRef.current,
        currentPointsRef.current,
        activeColor,
        brushSize,
        activeTool === 'eraser'
      );
      lastLiveStrokeSendRef.current = now;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch (err) {
      // Ignored
    }

    setIsDrawing(false);

    if (currentPointsRef.current.length >= 1) {
      const finalStroke: DrawStroke = {
        id: activeStrokeIdRef.current || `strk-${Date.now()}`,
        userId: myUserId,
        points: [...currentPointsRef.current],
        color: activeColor,
        size: brushSize,
        isEraser: activeTool === 'eraser'
      };
      onSendStroke(finalStroke);
    }

    currentPointsRef.current = [];
    activeStrokeIdRef.current = '';

    onSendCursor({
      userId: myUserId,
      nickname: myNickname,
      color: myColor,
      x: 0,
      y: 0,
      isDrawing: false
    });
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `viberoom-lousa-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950/80 rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl relative select-none">
      {/* Whiteboard Top Ribbon */}
      {!readOnly && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-900/90 border-b border-slate-800/80 z-10 shrink-0 overflow-x-auto no-scrollbar">
          {/* Tool selector */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTool('pen')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  activeTool === 'pen'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Pincel Suave"
                aria-label="Pincel"
              >
                <Pen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Pincel</span>
              </button>

              <button
                onClick={() => setActiveTool('eraser')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  activeTool === 'eraser'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Borracha"
                aria-label="Borracha"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Borracha</span>
              </button>
            </div>

            {/* Brush sizes */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              {SIZES.map((sz) => (
                <button
                  key={sz.val}
                  onClick={() => setBrushSize(sz.val)}
                  className={`w-7 h-7 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center ${
                    brushSize === sz.val
                      ? 'bg-slate-800 text-white font-medium border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={`Espessura: ${sz.label}`}
                  aria-label={sz.label}
                >
                  <div
                    className="rounded-full bg-current"
                    style={{ width: Math.max(3, sz.val / 2.2), height: Math.max(3, sz.val / 2.2) }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Color Palette */}
          {activeTool === 'pen' && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-1 shrink-0">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveColor(c)}
                  className={`w-5 h-5 rounded-full transition-transform cursor-pointer border shrink-0 ${
                    activeColor === c
                      ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900 border-white shadow-md'
                      : 'border-slate-700/60 hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          )}

          {/* Actions: Clear & Download */}
          <div className="flex items-center gap-1 shrink-0 ml-auto">
            <button
              onClick={onClear}
              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/40 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              title="Limpar quadro"
              aria-label="Limpar lousa"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[11px] font-medium">Limpar</span>
            </button>

            <button
              onClick={handleDownload}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              title="Baixar imagem (PNG)"
              aria-label="Salvar desenho"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[11px] font-medium">Salvar</span>
            </button>
          </div>
        </div>
      )}

      {/* Canvas Container with synchronized aspect ratio & perfectly aligned pointer overlay */}
      <div className="flex-1 w-full h-full relative flex items-center justify-center p-2 bg-slate-950 overflow-hidden min-h-0">
        <div
          ref={canvasWrapperRef}
          className="relative w-full h-full max-h-[82vh] aspect-[16/10] flex items-center justify-center"
        >
          <canvas
            ref={canvasRef}
            width={VIRTUAL_WIDTH}
            height={VIRTUAL_HEIGHT}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`w-full h-full object-contain rounded-xl border border-slate-800/90 shadow-2xl touch-none ${
              readOnly ? 'cursor-default' : activeTool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'
            }`}
          />

          {/* Synchronized Remote Cursors (Positioned 1:1 on the virtual coordinates!) */}
          {Object.values(remoteCursors).map((cur) => {
            if (cur.userId === myUserId || !cur.x || !cur.y) return null;

            const leftPercent = (cur.x / VIRTUAL_WIDTH) * 100;
            const topPercent = (cur.y / VIRTUAL_HEIGHT) * 100;

            return (
              <div
                key={cur.userId}
                className="absolute pointer-events-none transition-all duration-75 z-20 flex items-start gap-1"
                style={{
                  left: `${leftPercent}%`,
                  top: `${topPercent}%`,
                  transform: 'translate(-2px, -2px)'
                }}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-lg ${
                    cur.isDrawing ? 'scale-125 ring-2 ring-indigo-400' : ''
                  }`}
                  style={{ backgroundColor: cur.color }}
                />
                <div
                  className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-md shadow-md whitespace-nowrap flex items-center gap-1"
                  style={{ backgroundColor: cur.color }}
                >
                  <span>{cur.nickname}</span>
                  {cur.isDrawing && <Pen className="w-2.5 h-2.5 animate-spin" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
