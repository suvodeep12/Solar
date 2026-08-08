attribute float aSize;
attribute float aAlpha;
uniform float uTime;
varying float vAlpha;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float pulse = 0.85 + 0.15 * sin(uTime * 0.35 + position.x * 0.02 + position.z * 0.03);
  vAlpha = aAlpha * pulse;
  gl_PointSize = clamp(aSize * (150.0 / -mv.z), 1.0, 256.0);
  gl_Position = projectionMatrix * mv;
}
