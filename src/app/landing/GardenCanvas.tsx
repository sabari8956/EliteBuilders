"use client";

import { useEffect, useRef } from "react";

// ─── Grid config ─────────────────────────────────────────────────────────────
const COLS = 88;
const ROWS = 54;

// ─── Vertex shader ───────────────────────────────────────────────────────────
// Each character instance: a tiny quad placed at a grid cell.
// Brightness is driven by domain-warped FBM noise → organic leaf shapes.
const VS = `#version 300 es
in vec2 a_pos;     // quad corner [-0.5..0.5] x2
in vec2 a_uv;      // [0..1] tex coord
in float a_col;    // grid column (instance)
in float a_row;    // grid row   (instance)
in float a_seed;   // per-instance random [0..1]

uniform float u_cols;
uniform float u_rows;
uniform float u_time;

out vec2  v_uv;
out float v_bright;
out float v_char;

// ── Hash & gradient noise ──────────────────────────────────────────────────
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)),
           dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

float gnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(dot(hash2(i),              f - vec2(0,0)),
        dot(hash2(i + vec2(1,0)), f - vec2(1,0)), u.x),
    mix(dot(hash2(i + vec2(0,1)), f - vec2(0,1)),
        dot(hash2(i + vec2(1,1)), f - vec2(1,1)), u.x),
    u.y
  ) * 0.5 + 0.5;
}

// ── Fractal Brownian Motion (5 octaves) ────────────────────────────────────
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * gnoise(p);
    p  = p * 2.1 + vec2(3.11, 7.43);
    a *= 0.5;
  }
  return v;
}

void main() {
  // Normalised grid coord [0..1]
  vec2 norm = vec2(a_col / (u_cols - 1.0),
                   a_row / (u_rows - 1.0));

  // Cell size in NDC
  float cw = 2.0 / u_cols;
  float ch = 2.0 / u_rows;

  // Cell centre in NDC (Y flipped: row 0 = top of screen)
  vec2 centre = vec2(norm.x * 2.0 - 1.0,
                     1.0 - norm.y * 2.0);

  gl_Position = vec4(centre + a_pos * vec2(cw * 0.86, ch * 0.80), 0.0, 1.0);

  // ── Domain-warped FBM for organic leaf shapes ──────────────────────────
  float t  = u_time * 0.022;
  vec2  np = norm * vec2(8.5, 5.8);

  // First warp
  vec2 q = vec2(fbm(np + vec2(0.00, 0.00) + t),
                fbm(np + vec2(5.20, 1.30) + t));
  // Second warp
  vec2 r = vec2(fbm(np + 1.3 * q + vec2(1.70, 9.20) + 0.14 * t),
                fbm(np + 1.3 * q + vec2(8.30, 2.80) + 0.12 * t));
  // Final value
  float n = fbm(np + 1.1 * r + 0.018 * t);

  // Leaf blobs: bright centres, near-invisible surroundings
  v_bright = smoothstep(0.40, 0.67, n) * 0.88 + 0.03;

  // Character: hash-based, changes ~every 2–3 s, staggered by seed
  float tick = floor(u_time * 0.38 + a_seed * 8.17);
  v_char = mod(floor(a_seed * 17.3 + tick * 3.71), 10.0);

  v_uv = a_uv;
}`;

// ─── Fragment shader ─────────────────────────────────────────────────────────
// Samples one of the 10 character cells in the atlas, applies brightness.
const FS = `#version 300 es
precision mediump float;

in vec2  v_uv;
in float v_bright;
in float v_char;

uniform sampler2D u_atlas;

out vec4 fragColor;

void main() {
  float ci = clamp(floor(v_char + 0.5), 0.0, 9.0);
  float u  = (ci + v_uv.x) / 10.0;
  float a  = texture(u_atlas, vec2(u, v_uv.y)).r * v_bright;
  fragColor = vec4(1.0, 1.0, 1.0, a);
}`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error(`Shader: ${gl.getShaderInfoLog(s)}`);
  return s;
}

function createProgram(gl: WebGL2RenderingContext): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, compileShader(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(p, compileShader(gl, gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw new Error(`Link: ${gl.getProgramInfoLog(p)}`);
  return p;
}

// Build a 640×64 canvas with digits 0-9 side-by-side, upload as texture.
// UVs in the VS use V=0 at quad top → matches WebGL default (no FLIP_Y needed).
function createAtlas(gl: WebGL2RenderingContext): WebGLTexture {
  const CELL = 64;
  const c = document.createElement("canvas");
  c.width = CELL * 10;
  c.height = CELL;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.round(CELL * 0.74)}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < 10; i++) {
    ctx.fillText(String(i), i * CELL + CELL * 0.5, CELL * 0.5);
  }

  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // Canvas Y-down → texture Y-up
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tex;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function GardenCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false });
    if (!gl) {
      console.warn("WebGL2 unavailable — falling back to static background");
      return;
    }

    // ── Resize to device pixels ──────────────────────────────────────────
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width  = Math.round(window.innerWidth  * dpr);
      canvas!.height = Math.round(window.innerHeight * dpr);
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
    }
    resize();
    window.addEventListener("resize", resize);

    // ── Compile shaders ──────────────────────────────────────────────────
    let prog: WebGLProgram | undefined;
    try {
      prog = createProgram(gl);
    } catch (e) {
      console.error(e);
      window.removeEventListener("resize", resize);
      return;
    }

    // ── Character atlas texture ──────────────────────────────────────────
    const atlas = createAtlas(gl);

    // ── Quad geometry: 6 vertices, 2 triangles ───────────────────────────
    // a_pos in [-0.5..0.5]; a_uv: V=1 at bottom-quad (Y-down canvas convention)
    const quadVerts = new Float32Array([
      -0.5, -0.5,  0, 1,
       0.5, -0.5,  1, 1,
       0.5,  0.5,  1, 0,
      -0.5, -0.5,  0, 1,
       0.5,  0.5,  1, 0,
      -0.5,  0.5,  0, 0,
    ]);
    const qBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, qBuf);
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

    // ── Instance data: col, row, seed ────────────────────────────────────
    const N = COLS * ROWS;
    const instData = new Float32Array(N * 3);
    let ii = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        instData[ii++] = c;
        instData[ii++] = r;
        instData[ii++] = Math.random();
      }
    }
    const iBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, iBuf);
    gl.bufferData(gl.ARRAY_BUFFER, instData, gl.STATIC_DRAW);

    // ── VAO ──────────────────────────────────────────────────────────────
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);

    const L = (n: string) => gl.getAttribLocation(prog!, n);

    // Per-vertex (quad)
    gl.bindBuffer(gl.ARRAY_BUFFER, qBuf);
    gl.enableVertexAttribArray(L("a_pos"));
    gl.vertexAttribPointer(L("a_pos"), 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(L("a_uv"));
    gl.vertexAttribPointer(L("a_uv"),  2, gl.FLOAT, false, 16, 8);

    // Per-instance
    gl.bindBuffer(gl.ARRAY_BUFFER, iBuf);
    const aCol = L("a_col"), aRow = L("a_row"), aSeed = L("a_seed");
    gl.enableVertexAttribArray(aCol);
    gl.vertexAttribPointer(aCol, 1, gl.FLOAT, false, 12, 0);
    gl.vertexAttribDivisor(aCol, 1);
    gl.enableVertexAttribArray(aRow);
    gl.vertexAttribPointer(aRow, 1, gl.FLOAT, false, 12, 4);
    gl.vertexAttribDivisor(aRow, 1);
    gl.enableVertexAttribArray(aSeed);
    gl.vertexAttribPointer(aSeed, 1, gl.FLOAT, false, 12, 8);
    gl.vertexAttribDivisor(aSeed, 1);

    gl.bindVertexArray(null);

    // ── Uniforms ─────────────────────────────────────────────────────────
    const uCols  = gl.getUniformLocation(prog, "u_cols");
    const uRows  = gl.getUniformLocation(prog, "u_rows");
    const uTime  = gl.getUniformLocation(prog, "u_time");
    const uAtlas = gl.getUniformLocation(prog, "u_atlas");

    // ── Render state ─────────────────────────────────────────────────────
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.02, 0.02, 0.02, 1.0);

    let raf = 0;
    const t0 = performance.now();

    function draw() {
      const t = (performance.now() - t0) / 1000;

      gl!.clear(gl!.COLOR_BUFFER_BIT);
      gl!.useProgram(prog!);

      gl!.uniform1f(uCols, COLS);
      gl!.uniform1f(uRows, ROWS);
      gl!.uniform1f(uTime, t);
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, atlas);
      gl!.uniform1i(uAtlas, 0);

      gl!.bindVertexArray(vao);
      gl!.drawArraysInstanced(gl!.TRIANGLES, 0, 6, N);
      gl!.bindVertexArray(null);

      raf = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      gl.deleteTexture(atlas);
      gl.deleteBuffer(qBuf);
      gl.deleteBuffer(iBuf);
      gl.deleteVertexArray(vao);
      if (prog) gl.deleteProgram(prog);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
      }}
    />
  );
}
