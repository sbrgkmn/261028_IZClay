# İZ — Clay Pattern Lab

A separate, local Biennale proposal prototype built beside ClayFlow. It interprets the supplied column photographs and concept studies as periodic patterns, then generates layered clay-printing moves on cylindrical, barrel and tapered profiles.

## Run

From this folder, after installing dependencies:

```sh
npm run dev
```

Open http://127.0.0.1:3001/. The ClayFlow app uses a separate entry point and port. To check this app, run `npm test` and `npm run build`. The build writes to this folder's `dist/`.

## Workflow

1. Choose arches, floral lattice, stepped meander, chevrons, woven grid, or a vertically blended collection.
2. Choose relief (continuous radial displacement), beads (localized radial pulses), or loops (attached outward excursions).
3. Adjust repeat count, row height, motif width, projection, placement, spacing and layer cadence. Set the profile and specimen dimensions in Form.
4. Inspect Clay, Toolpath and Unwrapped views. Play print animates the exported motion with pause, speed, restart and scrubbing controls. It starts at the first printing point and excludes machine scripts and acceleration. The layer slider reveals the build; Isolate shows one layer. Toolpath color distinguishes the selected layer from earlier layers. Travel is omitted from this view.
5. Set layer/bead dimensions, speed, wall and patterned flow, retraction and travel lift. Export G-code for a test coupon, CSV points for analysis, or JSON for a reproducible study. The specimen notebook persists up to 12 configurations in browser storage.

## Fabrication model

The preview and export consume the same paths (closed loops or connected rising turns). Inner wall passes follow the plain profile; the outer pass carries the pattern. Loop excursions return to their attachment point. Pattern flow scales extrusion locally using motif intensity. The visual bead uses the specified nominal width and layer height; changing flow does not simulate a measured material thickness change.

The app imports ClayFlow's PotterBot Super 10 profile from `src/clayflow/profiles.ts` (a snapshot of the ClayFlow profile) and uses its empirical E calibration (3.426 E per path mm at 5 × 1.5 mm bead dimensions). E is machine-calibrated output, not a universal piston-distance unit. Scripts retain the source profile's 3000 E start prime and 150 mm / −4000 E end lift. Continuous spiral is the default for single-wall relief, beads and loops: a flat first ring is followed by continuously rising turns, with no per-turn travel, retraction, recovery or E reset. Flow accounts for the changing vertical gap at the first rising turn and a partial final turn. The rim is helical by up to one layer. Multiple walls require explicit Stepped mode. Bead phase varies continuously with height; loops remain attached and rise along their arc length.

At disconnected path ends, deposition tapers to zero over 2 mm, followed by 8 E of retraction during the final 1 mm of XY motion. These distances are adjustable; zero early-retract distance restores stationary retraction. Recovery defaults to 100% over 24 mm and is adjustable independently. Spiral uses these end controls only at its final endpoint. Toolpath colors show taper (amber), retraction (purple), and recovery (blue). Nominal bead geometry does not model residual flow during these moves.

Nozzle diameter defaults to 3 mm. Changing it in the UI also sets bead width to match; width remains independently adjustable. E scales with commanded bead width and layer height rather than nozzle bore area. Old studies preserve their explicit bead width. Nominal specimen diameter is limited to 250 mm; profile expansion and texture can extend farther, subject to the machine-envelope check.

Exports check finite coordinates and the machine envelope, including the end lift. They produce open-bottom wall coupons. Outward texture is deliberately allowed beyond support: sag, collisions, ooze, acceleration limits and pressure response are not simulated or certified. Time estimates include extrusion motion only. No machine connection or automatic printing is provided.

## References and scope

Originals remain in `../Biennale/`. Selected copies in `public/references/` are used for local reference only:

- Concept Development/0.jpg and 1.jpg → concept relief and bead columns.
- Photos of the Columns/52266119.Diyarbakir_Ulu_Cami_2995.jpg → stepped bands.
- Photos of the Columns/52266128.Diyarbakir_Ulu_Cami_2998.jpg → floral lattice.
- Photos of the Columns/52266103.Diyarbakir_Ulu_Cami_2988.jpg → diagonal branching.
- Concept Development/texture.jpg and Timea_Tihanyi_Etelkoz_large_01.webp → texture references (artist attribution follows the supplied filename).

Presets are procedural interpretations, not measured archaeological reconstructions or automatic image tracing. `unnamed.gh` is preserved but has not been executed or ported. Published through ChatGPT Sites.

## Validation

Engine tests cover periodic seams, all six motif families across three profiles and three deposition gestures, exact path closure, intact inner passes, zero displacement, input normalization, travel retraction and rejected invalid/out-of-bounds exports. Tests also verify continuously increasing Z, exact turn joins and animation/export move parity. Browser checks cover the responsive layout, motif and view switching, layer isolation, profile changes and G-code generation feedback.
