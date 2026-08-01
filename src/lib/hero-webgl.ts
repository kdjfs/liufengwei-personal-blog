const vertexShader = `
  attribute vec2 a_position;
  uniform float u_time;
  uniform vec2 u_pointer;
  uniform float u_aspect;

  void main() {
    vec2 p = a_position;
    float wave = sin(u_time * 0.28 + p.x * 3.2) * 0.025;
    p.y += wave;
    p += u_pointer * (0.03 + length(a_position) * 0.018);
    p.x /= max(1.0, u_aspect * 0.72);
    gl_Position = vec4(p, 0.0, 1.0);
    gl_PointSize = 2.2 + (1.0 - min(length(a_position), 1.0)) * 1.6;
  }
`;

const fragmentShader = `
  precision mediump float;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float alpha = smoothstep(0.5, 0.08, length(center)) * 0.55;
    gl_FragColor = vec4(0.62, 0.55, 1.0, alpha);
  }
`;

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * 原生 WebGL 足以完成克制的点阵视差，因此没有为几十个点引入完整 3D 引擎。
 * 返回统一清理函数，确保 View Transition 切页后不会遗留 RAF 与 GPU 资源。
 */
export function createHeroRenderer(canvas: HTMLCanvasElement): () => void {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    powerPreference: 'low-power',
  });
  if (!gl) return () => undefined;

  const vert = compileShader(gl, gl.VERTEX_SHADER, vertexShader);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader);
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  if (!vert || !frag || !program || !buffer) return () => undefined;

  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return () => undefined;
  // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API 方法名，不是 React Hook。
  gl.useProgram(program);

  const count = 92;
  const points = new Float32Array(count * 2);
  for (let index = 0; index < count; index += 1) {
    const radius = 0.22 + Math.random() * 1.2;
    const angle = Math.random() * Math.PI * 2;
    points[index * 2] = Math.cos(angle) * radius;
    points[index * 2 + 1] = Math.sin(angle) * radius * 0.72;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const timeLocation = gl.getUniformLocation(program, 'u_time');
  const pointerLocation = gl.getUniformLocation(program, 'u_pointer');
  const aspectLocation = gl.getUniformLocation(program, 'u_aspect');
  const pointer = { x: 0, y: 0 };
  let frame = 0;
  let disposed = false;

  const resize = () => {
    const bounds = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio, 1.5);
    const width = Math.max(1, Math.floor(bounds.width * dpr));
    const height = Math.max(1, Math.floor(bounds.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
    gl.uniform1f(aspectLocation, width / height);
  };

  const move = (event: PointerEvent) => {
    pointer.x = event.clientX / window.innerWidth - 0.5;
    pointer.y = -(event.clientY / window.innerHeight - 0.5);
  };

  const render = (time: number) => {
    if (disposed) return;
    resize();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(timeLocation, time / 1000);
    gl.uniform2f(pointerLocation, pointer.x, pointer.y);
    gl.drawArrays(gl.POINTS, 0, count);
    frame = requestAnimationFrame(render);
  };

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', move, { passive: true });
  frame = requestAnimationFrame(render);

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', move);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl.deleteShader(vert);
    gl.deleteShader(frag);
  };
}
