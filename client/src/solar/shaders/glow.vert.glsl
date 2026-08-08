attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
uniform float uTime;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float breath = 0.9 + 0.1 * sin(uTime * 0.22 + position.x * 0.012 + position.z * 0.02);
  vAlpha = aAlpha * breath;
  gl_PointSize = clamp(aSize * (150.0 / -mv.z), 1.0, 256.0);
  gl_Position = projectionMatrix * mv;
}
