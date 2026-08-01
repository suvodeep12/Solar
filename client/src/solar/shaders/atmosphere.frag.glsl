uniform vec3 uColor;
uniform float uIntensity;
uniform float uPower;
varying vec3 vNormal;
varying vec3 vView;

void main() {
  float fres = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0), uPower);
  gl_FragColor = vec4(uColor, fres * uIntensity);
}
