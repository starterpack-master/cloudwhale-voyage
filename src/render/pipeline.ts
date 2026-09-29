import {
  Color, DepthTexture, LinearSRGBColorSpace, Mesh, NearestFilter, OrthographicCamera, PerspectiveCamera,
  PlaneGeometry, Scene, ShaderMaterial, UnsignedIntType, Vector2, WebGLRenderTarget, WebGLRenderer,
} from 'three';

// 저해상도로 그린 뒤 외곽선·비네트를 입혀 정수 배율로 확대 → 도트 느낌 + 모바일 성능
const POST = /* glsl */ `
uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 uRes; uniform float uPixel;
uniform float uNear; uniform float uFar; uniform vec3 uOutline; uniform float uVig;
float lin(vec2 uv){ float z = texture2D(tDepth, uv).x * 2.0 - 1.0;
  return (2.0 * uNear * uFar) / (uFar + uNear - z * (uFar - uNear)); }
void main(){
  vec2 t = 1.0 / uRes;
  vec2 uv = (floor(gl_FragCoord.xy / uPixel) + 0.5) * t;
  vec3 c = texture2D(tColor, uv).rgb;
  float d = lin(uv);
  float dmax = max(max(lin(uv + vec2(t.x, 0.0)), lin(uv - vec2(t.x, 0.0))),
                   max(lin(uv + vec2(0.0, t.y)), lin(uv - vec2(0.0, t.y))));
  float edge = step(max(0.5, d * 0.05), dmax - d);
  if (dmax > uFar * 0.8 && d > 60.0) edge = 0.0;
  c = mix(c, c * uOutline, edge * 0.85);
  vec2 q = gl_FragCoord.xy / (uRes * uPixel) - 0.5;
  c *= 1.0 - uVig * dot(q, q) * 1.6;
  gl_FragColor = vec4(c, 1.0);
}`;

export class PixelPipeline {
  readonly renderer: WebGLRenderer;
  private rt: WebGLRenderTarget;
  private post = new Scene();
  private postCam = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private mat: ShaderMaterial;
  pixel = 4;
  iw = 1;
  ih = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = LinearSRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 3));
    this.rt = new WebGLRenderTarget(1, 1, { minFilter: NearestFilter, magFilter: NearestFilter });
    this.rt.depthTexture = new DepthTexture(1, 1, UnsignedIntType);
    this.mat = new ShaderMaterial({
      uniforms: {
        tColor: { value: this.rt.texture }, tDepth: { value: this.rt.depthTexture },
        uRes: { value: new Vector2(1, 1) }, uPixel: { value: 4 }, uNear: { value: 1 }, uFar: { value: 400 },
        uOutline: { value: new Color('#6E5FA8') }, uVig: { value: 0.16 },
      },
      vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: POST,
      depthTest: false,
      depthWrite: false,
    });
    const quad = new Mesh(new PlaneGeometry(2, 2), this.mat);
    quad.frustumCulled = false;
    this.post.add(quad);
  }

  // 긴 변 기준 내부 해상도 약 480px
  resize(w: number, h: number): void {
    this.renderer.setSize(w, h, false);
    const dpr = this.renderer.getPixelRatio();
    const dw = Math.floor(w * dpr);
    const dh = Math.floor(h * dpr);
    this.pixel = Math.max(2, Math.round(Math.max(dw, dh) / 480));
    this.iw = Math.ceil(dw / this.pixel);
    this.ih = Math.ceil(dh / this.pixel);
    this.rt.setSize(this.iw, this.ih);
    this.mat.uniforms.uRes.value.set(this.iw, this.ih);
    this.mat.uniforms.uPixel.value = this.pixel;
  }

  render(scene: Scene, cam: PerspectiveCamera, clear: Color): void {
    const r = this.renderer;
    r.setClearColor(clear, 1);
    r.setRenderTarget(this.rt);
    r.clear();
    r.render(scene, cam);
    r.setRenderTarget(null);
    this.mat.uniforms.uNear.value = cam.near;
    this.mat.uniforms.uFar.value = cam.far;
    r.render(this.post, this.postCam);
  }
}
