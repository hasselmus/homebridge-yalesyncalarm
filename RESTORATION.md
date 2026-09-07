# Restoration notes

This repository preserves `homebridge-yalesyncalarm` v1.2.4 as a known-working Homebridge plugin.

## Provenance

The original source survives in Jonathan Dann's repository `jonathandann/homebridge-yalealarmsystem`. Its current `master` tip is commit `84d889e4a127124af22d56950845ebc2ef6dadb0` (`v1.2.4`, 2020-03-03). Although the GitHub repository is named `homebridge-yalealarmsystem`, its package metadata and source identify the package as `homebridge-yalesyncalarm`.

The TypeScript source, build configuration, package lock, licence and README in this repository were restored from that v1.2.4 upstream source. The `dist/` directory was preserved from a working npm installation on Homebridge rather than regenerated.

## Homebridge compatibility patch

Modern Homebridge no longer provides `PlatformAccessory.updateReachability()`. Three calls to:

```ts
accessory.updateReachability(true)
```

were removed from `configureMotionSensor()`, `configureContactSensor()` and `configurePanel()` in `src/YaleSyncPlatform.ts`. The corresponding calls were also removed from the preserved working `dist/YaleSyncPlatform.js`.

The preserved working JavaScript has SHA-256:

`354988bc208708505cb09c24e87cd3635dde053f796f2591ad5158bc1782384e`

The source map in `dist/` is preserved exactly from the installed package and therefore predates the three-line compatibility edit. A future `npm run build` will regenerate `dist/` and its maps from the patched TypeScript source.

## Deliberate repository differences from upstream

Upstream ignored `dist/`. This preservation repository intentionally versions `dist/` so that the exact known-working runtime is retained alongside reconstructible source. `node_modules/` is deliberately excluded; dependency versions are recorded in the original v1.2.4 `package-lock.json`.
