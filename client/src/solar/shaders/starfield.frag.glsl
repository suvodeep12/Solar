varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float falloff = pow(1.0 - d * 2.0, 2.0);
  gl_FragColor = vec4(vColor * (0.75 + 0.55 * falloff), falloff * vAlpha);
}
