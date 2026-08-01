attribute float aSize;
attribute float aTwinkle;
attribute vec3 aColor;
uniform float uTime;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float tw = 0.6 + 0.4 * sin(uTime * (0.5 + aTwinkle * 2.4) + aTwinkle * 40.0);
  gl_PointSize = clamp(aSize * (150.0 / -mv.z) * tw, 1.0, 12.0);
  vAlpha = tw;
  gl_Position = projectionMatrix * mv;
}
