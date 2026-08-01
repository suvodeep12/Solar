import { Effect } from 'postprocessing';
import { useMemo } from 'react';
import { Uniform } from 'three';

const FRAGMENT = /* glsl */ `
  uniform float uSaturation;
  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    float luma = dot(inputColor.rgb, vec3(0.2125, 0.7154, 0.0721));
    outputColor = vec4(mix(vec3(luma), inputColor.rgb, uSaturation), inputColor.a);
  }
`;

export function Saturation({ amount }: { amount: number }) {
  const effect = useMemo(
    () =>
      new Effect('Saturation', FRAGMENT, {
        uniforms: new Map([['uSaturation', new Uniform(amount)]]),
      }),
    [amount],
  );
  return <primitive object={effect} dispose={null} />;
}
