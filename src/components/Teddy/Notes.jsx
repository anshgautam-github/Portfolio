import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { teddy } from "./teddyContent.js";

const KEY = "teddy.notes.v1";
const COLORS = ["yellow", "pink", "orange", "purple", "mint"];

let nid = 0;
const mk = (n) => ({ id: `n${++nid}-${Math.random().toString(36).slice(2, 6)}`, z: 1, ...n });

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(raw) && raw.length) return raw.map((n) => ({ ...n, id: n.id || mk({}).id }));
  } catch (_) {
    /* private mode / blocked storage */
  }
  return teddy.notes.map((n) => mk(n));
}

const Notes = forwardRef(function Notes({ active, play }, ref) {
  const board = useRef(null);
  const [notes, setNotes] = useState(load);
  const [size, setSize] = useState({ w: 520, h: 360 });
  const zTop = useRef(10);
  const drag = useRef(null);
  const focusId = useRef(null);
  const NW = size.w >= 640 ? 150 : 112;
  const NH = Math.round(NW * 0.88);

  /* persist */
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(notes));
    } catch (_) {
      /* ignore */
    }
  }, [notes]);

  /* board size drives the px position of every note (positions are stored as 0..1 fractions) */
  useEffect(() => {
    const el = board.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width) setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const patch = useCallback((id, p) => setNotes((ns) => ns.map((n) => (n.id === id ? { ...n, ...p } : n))), []);

  const px = (n) => ({
    left: Math.max(0, Math.min(1, n.fx)) * Math.max(0, size.w - NW),
    top: Math.max(0, Math.min(1, n.fy)) * Math.max(0, size.h - NH),
  });

  /* ---------- drag by the tape strip ---------- */
  const down = (e, n) => {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    const el = e.currentTarget.parentElement;
    el.setPointerCapture?.(e.pointerId);
    zTop.current += 1;
    el.style.zIndex = zTop.current;
    patch(n.id, { z: zTop.current });
    const p = px(n);
    drag.current = { id: n.id, el, sx: e.clientX, sy: e.clientY, ox: p.left, oy: p.top, x: p.left, y: p.top };
    el.classList.add("lift");
    play("tab");
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    d.x = Math.max(0, Math.min(size.w - NW, d.ox + e.clientX - d.sx));
    d.y = Math.max(0, Math.min(size.h - NH, d.oy + e.clientY - d.sy));
    d.el.style.left = d.x + "px";
    d.el.style.top = d.y + "px";
  };
  const up = () => {
    const d = drag.current;
    if (!d) return;
    d.el.classList.remove("lift");
    patch(d.id, {
      fx: size.w > NW ? d.x / (size.w - NW) : 0,
      fy: size.h > NH ? d.y / (size.h - NH) : 0,
      rot: Math.round((Math.random() - 0.5) * 12),
    });
    drag.current = null;
  };

  const add = () => {
    if (notes.length >= 24) return;
    const n = mk({
      text: "",
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      fx: 0.25 + Math.random() * 0.5,
      fy: 0.15 + Math.random() * 0.55,
      rot: Math.round((Math.random() - 0.5) * 14),
      z: ++zTop.current,
      fresh: true,
    });
    focusId.current = n.id;
    setNotes((ns) => [...ns, n]);
    play("pop");
  };

  useImperativeHandle(ref, () => ({ add }));

  const remove = (id) => {
    setNotes((ns) => ns.filter((n) => n.id !== id));
    play("err");
  };

  return (
    <div className="ted-notes">
      <div className="ted-notes-bar">
        <span>{notes.length} notes · drag the tape · edit in place</span>
        <button type="button" className="ted-btn solid" onClick={add}>
          + new note
        </button>
      </div>

      <div className="ted-board" ref={board} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        {notes.map((n) => {
          const p = px(n);
          return (
            <div
              key={n.id}
              className={`ted-note c-${n.color}${n.fresh ? " fresh" : ""}`}
              style={{ left: p.left, top: p.top, width: NW, height: NH, zIndex: n.z, "--r": `${n.rot || 0}deg`, "--fs": `${Math.round(NW * 0.14)}px` }}
            >
              <div className="tape" onPointerDown={(e) => down(e, n)} title="drag me">
                <button type="button" className="x" aria-label="Delete note" onPointerDown={(e) => e.stopPropagation()} onClick={() => remove(n.id)}>
                  ×
                </button>
              </div>
              <textarea
                value={n.text}
                maxLength={90}
                placeholder="write something..."
                aria-label="Sticky note text"
                ref={(el) => {
                  if (el && focusId.current === n.id) {
                    focusId.current = null;
                    el.focus();
                  }
                }}
                onChange={(e) => patch(n.id, { text: e.target.value })}
                onPointerDown={() => {
                  zTop.current += 1;
                  patch(n.id, { z: zTop.current });
                }}
              />
            </div>
          );
        })}
        {notes.length === 0 && <div className="ted-notes-empty">the board is empty. add a note!</div>}
      </div>
    </div>
  );
});

export default Notes;
