# İZ — Column Studio

Local composition and fabrication workspace for the Biennale column proposal. Run `npm run dev`, then open http://127.0.0.1:3001/.

## Compose

The ordered stack is stored bottom-to-top and shown top-to-bottom in the interface. Add, duplicate, reorder, remove and select up to 12 parts. Each part has a motif, height and pattern rotation; diameter, U/V repetition, relief and print settings are shared. U is the integer repetition around the circumference (default 8); V is the repetition count over the entire assembled height. Setting V keeps that count fixed when column height changes. Older saved designs retain their existing radial count and row spacing until edited. The default limit is 300 mm per part. Oversized or fractional-layer parts are blocked from export until corrected. Save/Open round-trips the column JSON; older IZ study JSON files import as one segment. The working column autosaves separately from the old specimen notebook.

The library contains seven historic constructions and one connector: floral medallions (octagon/floret, four cardinal plus cells and four diagonal hexagons), flower and key (bent-cross ribbons around a floret), linked square/hexagon cells, touching scalloped arcs, diagonal leaf and key, gapless plus tessellation, alternating vertical/horizontal I figures, and vertical ribs. Photos 2988 and 2989 are combined into the same leaf-and-key construction. References pairs the seven constructions with their source photographs; vertical ribs are a new connector. Legacy diagonal studies migrate to leaf-and-key and blend studies to meander.

The entire column, exploded stack and selected part now use the generated extrusion paths. Deposited clay sweeps an elliptical bead of nominal bead width and layer height along those paths. There is no embossed envelope mesh. Toolpaths show the extrusion plan including taper/retraction/recovery colors; travel is omitted. Build-height clipping reveals the stack bottom to top. The nominal bead preview does not predict pressure-dependent thickness, sag or deformation.

A world-height field preserves row phase and interpolates corresponding contour radii with quintic smootherstep on both sides of each change. A minimum of four layers per side prevents abrupt zero-width switches; the transition is capped at one third of each adjacent part height. All 64 ordered pattern pairs are tested for exact printed-rim XY agreement and continuity at the change. The single wall follows the radial ornament on both faces; it does not have a separately printed circular inner wall. Continuous motif mode uses the same relief outline for the top ring of one part and the bottom ring of the next. Local sampling holds the lower boundary through the anchor and initial rise, and the upper boundary through the final rise and leveling turn. Parts must retain their designed angular alignment. An optional plain-collar mode fades relief into at least two circular layers at each end. Neither mode removes the physical seam or compensates for firing distortion. Each change is a separate print; the program never exports the full assembled column as one tall job. View Column, Exploded, Selected part or Toolpath; selected-part playback uses the same extrusion plan as export.

## Connect

The Connect panel proposes a separate internal alignment sleeve: 40 mm high, 20 mm insertion each side, 3 mm wall plus captive-nut bosses, six M4 connections (three per segment at 120 degrees), and 6 mm ceramic clearance holes 12 mm above/below the joint. Padded washers distribute contact. The sleeve is a prototype for separate polymer fabrication, not an integrated clay ledge or a rated structural connector. Sleeve CAD, nut retention, bolt length, load capacity, drilling procedure and material suitability still require a two-coupon test and fabrication detailing.

Enter measured fired bore and outside diameter, plus radial clearance. The sleeve estimate and downloadable 1:1 SVG wrap template use these measurements. Print the template at 100% and check its 50 mm scale. No assumed firing-shrinkage percentage is applied. Measurements persist in the design file. Ceramic toolpaths do not include sleeve geometry or bolt holes.

Bolts lock the assembly, with 120-degree indexing. The proposal's independently rotating/illuminated concept needs a different bearing/support and lighting design. The open bore is retained but neither function is claimed as implemented.

## Print

Each segment uses one continuous spiral wall: a flat anchor, uninterrupted rising turns, and one connected level finishing turn with extrusion thickness diminishing to zero. There are no per-turn travel moves, retractions or extrusion-coordinate resets. The finishing turn is intended to fill the helical rim height difference; its physical result requires a clay coupon test. Startup and the final endpoint remain, but the repeated vertical restart seam is removed. Each part is independently bed-referenced and inherits the Super 10 profile. Export one part or a ZIP containing numbered G-code files, column JSON, assembly CSV, and assembly notes. The 150 mm end lift remains included in the machine-envelope check. Review the inherited prime/pressure calibration before machine use. Geometry checks do not model sag, clay rheology, shrinkage or structural stability.

`node node_modules/typescript/bin/tsc --noEmit`

`node node_modules/vitest/vitest.mjs run --config vitest.config.ts --testTimeout=30000`

`node node_modules/vite/bin/vite.js build`

The extended timeout covers the existing matrix of all motifs, profiles and deposition treatments on slower hosts. Tests cover cylindrical periodicity, blended boundary continuity, matched rim outlines, uninterrupted spiral moves, tapering leveling turns, local export coordinates, layer/height rejection, file migration and ZIP records, alongside the original extrusion/playback tests.

## Research reviewed

- `../Biennale/Istanbul Biennial Notes.docx`: modular pattern mixture, illumination and independently rotating pieces.
- Ulu Cami photos 2986 (scales), 2988 (diagonal branches), 2990 (crossed bands), 2995 (angular meander), 2998 (floral medallions), with wider column/context photographs.
- Model Photos, Models 1–8: deposited beads/loops and relief, flat versus uneven rims, and thin-walled open cylinders.
- Concept Development photographs: continuous ornament and clay texture.
- Julian Raby, *Nur al-Din, the Qastal al-Shuʿaybiyya, and the “Classical Revival”*, supplied DPC2151.pdf, especially pp. 301–303 on Diyarbakır. Contextual research only; no measured geometry is inferred from it.
- `column.gh` and `unnamed.gh` are binary Grasshopper definitions; preserved and identified, not executed or translated.

## Local setup

The source repository contained a Mac-specific tracked `node_modules` symlink. Local setup replaced it with actual Windows dependencies and a package lock. No source push or production deployment was performed.


Print controls restore relief, radial beads and outward loops, nozzle and bead diameter, layer height, speed, texture spacing/cadence, wall count (1–3), flow and pressure/restart settings. Auto strategy spirals with one wall; multiple walls or explicit stepped strategy use separate paths. Beads and loops reach both ends; only explicit plain-collar mode adds plain bands. End turns carry texture regardless of cadence, and the leveling turn retains the final texture outline. These options persist in saved designs and feed preview, playback and G-code.
