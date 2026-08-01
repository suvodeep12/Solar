import { OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { bodyById, moonById } from '../bodies/jpl.ts';
import { sceneBody, sceneMoonSpec, sunRadiusScene } from '../bodies/display.ts';
import { AU_UNIT, bodyPositionAt, moonPositionAt } from '../simulation/orbitMath.ts';
import { tiltedPosition } from '../simulation/axialTilt.ts';
import { useTimeStore } from '../simulation/timeStore.ts';
import { useUiStore } from '../simulation/uiStore.ts';

const OVERVIEW_DIST = Math.sqrt(18 * 18 + 36 * 36);
const FLY_DURATION = 1.3;
/** A manual pan that moves the target this far from the followed body sticks
 *  for PAN_STICK_SECONDS, then the follow glides back. */
const PAN_THRESHOLD = 0.2;
const PAN_STICK_SECONDS = 3;
/** Pan offsets below this snap to zero — nothing left to visibly glide. */
const PAN_EPSILON = 1e-4;
/** How fast a stuck pan offset relaxes back to zero (1/s lerp rate). */
const PAN_RELAX_RATE = 3;

interface Fly {
  fromDist: number;
  toDist: number;
  /** Unit vector from the click-time camera toward the target */
  dir: THREE.Vector3;
  /** Wall-clock seconds when the fly started */
  t0: number;
}

type TargetKind = 'star' | 'planet' | 'moon';

/** Module-level scratch — the render loop must never allocate. */
const _pos = new THREE.Vector3();
const _delta = new THREE.Vector3();
const _zero = new THREE.Vector3();

/** World position (written into `out`) + viewing distance for any selectable
 *  target (star, planet/dwarf, or moon — moons live in the parent's tilted frame). */
function resolveTarget(
  id: string,
  days: number,
  out: THREE.Vector3,
): { pos: THREE.Vector3; dist: number; kind: TargetKind } | null {
  const body = bodyById(id);
  if (body) {
    if (body.kind === 'star') {
      out.set(0, 0, 0);
      return { pos: out, dist: Math.max(sunRadiusScene() * 12, 0.8), kind: 'star' };
    }
    const scene = sceneBody(body);
    const p = bodyPositionAt(body, days);
    out.set(p.x * AU_UNIT, p.y * AU_UNIT, p.z * AU_UNIT);
    return { pos: out, dist: Math.max(scene.radiusScene * 12, 0.8), kind: 'planet' };
  }
  const ref = moonById(id);
  if (!ref) return null;
  const planetScene = sceneBody(ref.parent);
  const moonScene = sceneMoonSpec(ref.moon, planetScene.radiusScene);
  const planetP = bodyPositionAt(ref.parent, days);
  const local = moonPositionAt(ref.moon, moonScene.sceneDistance, days);
  const offset = tiltedPosition(local, ref.parent.axialTiltDeg);
  out.set(
    planetP.x * AU_UNIT + offset.x,
    planetP.y * AU_UNIT + offset.y,
    planetP.z * AU_UNIT + offset.z,
  );
  return { pos: out, dist: Math.max(moonScene.sceneRadius * 12, 0.6), kind: 'moon' };
}

export function CameraRig() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const selectedId = useUiStore((s) => s.selectedId);
  const focusTick = useUiStore((s) => s.focusTick);
  const focus = useRef({
    pos: new THREE.Vector3(0, 0, 0),
    targetDist: OVERVIEW_DIST,
    fly: null as Fly | null,
  });
  /** The user's pan as a world-space offset from the followed body. The
   *  follow derives `controls.target = body + panOffset` each frame, so a pan
   *  slides the body off-center instead of fighting the re-aim. */
  const panOffset = useRef(new THREE.Vector3());
  const prevMoon = useRef({ v: new THREE.Vector3(), active: false });
  /** Any OrbitControls gesture (rotate/zoom/pan) in flight — the follow must
   *  not touch controls.target mid-gesture (OrbitControls owns it). */
  const interacting = useRef(false);
  /** Wall-clock seconds until the pan offset may relax again after a manual
   *  pan: pans stick for ~3s after release, then gently glide back. */
  const panPauseUntil = useRef(0);

  const isMoon =
    selectedId !== null && bodyById(selectedId) === undefined && moonById(selectedId) !== undefined;

  useEffect(() => {
    const f = focus.current;
    if (selectedId === null) {
      f.pos.set(0, 0, 0);
      f.targetDist = OVERVIEW_DIST;
      f.fly = null;
      panOffset.current.set(0, 0, 0);
      return;
    }
    const target = resolveTarget(selectedId, useTimeStore.getState().days, _pos);
    if (!target) return;
    f.pos.copy(target.pos);
    f.targetDist = target.dist;
    // A new fly is a fresh intent: drop any leftover pan offset and pending
    // pan pause so the follow re-aims immediately once the fly lands.
    panOffset.current.set(0, 0, 0);
    interacting.current = false;
    panPauseUntil.current = 0;
    const camera = controlsRef.current?.object;
    if (!camera) return;
    const fromPos = camera.position;
    _delta.copy(f.pos).sub(fromPos);
    const fromDist = Math.max(_delta.length(), 1e-3);
    f.fly = {
      fromDist,
      toDist: f.targetDist,
      dir: _delta.clone().normalize(),
      t0: performance.now() / 1000,
    };
  }, [selectedId, focusTick]);

  useFrame(({ camera }, dt) => {
    const f = focus.current;
    const controls = controlsRef.current;

    const target =
      selectedId !== null ? resolveTarget(selectedId, useTimeStore.getState().days, _pos) : null;
    if (target) f.pos.copy(target.pos);

    // Moons sweep around their parent fast (days, not years): delta-follow
    // the moon's displacement so the camera stays glued to it without
    // fighting OrbitControls' wheel/rotate (which own camera.pos). The
    // controls.target must ride the same displacement so the rotate pivot
    // stays on the moon mid-gesture — safe now that the copy below doesn't
    // unconditionally wipe it.
    if (target?.kind === 'moon' && !f.fly && prevMoon.current.active) {
      _delta.copy(f.pos).sub(prevMoon.current.v);
      if (_delta.lengthSq() > 1e-14) {
        camera.position.add(_delta);
        controls?.target.add(_delta);
      }
    }
    prevMoon.current.active = target?.kind === 'moon';
    if (prevMoon.current.active) {
      prevMoon.current.v.copy(f.pos);
    }

    const now = performance.now() / 1000;
    // Outside a gesture and past any pan stick: ease the pan offset back to
    // zero so the body gently re-centers (never re-derived — OrbitControls
    // keeps full wheel/rotate freedom).
    if (!interacting.current && now > panPauseUntil.current) {
      panOffset.current.lerp(_zero, 1 - Math.exp(-dt * PAN_RELAX_RATE));
      if (panOffset.current.lengthSq() < PAN_EPSILON * PAN_EPSILON) {
        panOffset.current.set(0, 0, 0);
      }
    }

    if (controls) {
      if (f.fly) {
        const elapsed = performance.now() / 1000 - f.fly.t0;
        const t = Math.min(1, elapsed / FLY_DURATION);
        const ease = 1 - Math.pow(1 - t, 3);
        const dist = THREE.MathUtils.lerp(f.fly.fromDist, f.fly.toDist, ease);
        camera.position.copy(f.pos).addScaledVector(f.fly.dir, -dist);
        if (t >= 1) f.fly = null;
      }
      // CRITICAL copy rule: only when no gesture owns the controls (or during
      // a fly, whose camera must track f.pos even mid-flight). While
      // interacting, OrbitControls holds controls.target; the moon delta-follow
      // above keeps it glued instead.
      if (!interacting.current || f.fly) {
        controls.target.copy(f.pos).add(panOffset.current);
      }
      controls.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.12}
      minDistance={isMoon ? 0.15 : 0.6}
      maxDistance={140}
      onStart={() => {
        focus.current.fly = null;
        interacting.current = true;
        panPauseUntil.current = performance.now() / 1000 + PAN_STICK_SECONDS;
      }}
      onEnd={() => {
        interacting.current = false;
        const controls = controlsRef.current;
        if (!controls) return;
        // A pan drags controls.target away from the followed body; rotate/zoom
        // keep it near f.pos (moons: the delta-follow moved it by the moon's
        // displacement every frame, which cancels out in this subtraction).
        panOffset.current.copy(controls.target).sub(focus.current.pos);
        if (panOffset.current.length() > PAN_THRESHOLD) {
          panPauseUntil.current = performance.now() / 1000 + PAN_STICK_SECONDS;
        }
      }}
    />
  );
}
