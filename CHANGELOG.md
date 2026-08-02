# Changelog

## [1.1.2](https://github.com/kuma-00/Mogu2/compare/v1.1.1...v1.1.2) (2026-08-02)


### Bug Fixes

* expose TypeScript declarations for Bun package ([f361db2](https://github.com/kuma-00/Mogu2/commit/f361db2f9369fa182599ebc7a29540664e680e7d))

## [1.1.1](https://github.com/kuma-00/Mogu2/compare/v1.1.0...v1.1.1) (2026-08-02)


### Bug Fixes

* align lockfiles with release version ([5b8d308](https://github.com/kuma-00/Mogu2/commit/5b8d30823dacaaf1b3b7bda1375672ea9c5cf4b0))


### Build System

* move Bun package sources under src ([4e585d8](https://github.com/kuma-00/Mogu2/commit/4e585d8ed9acc111eadd4db6f7994d3b6c8735ab))

## [1.1.0](https://github.com/kuma-00/Mogu2/compare/v1.0.11...v1.1.0) (2026-07-28)


### Features

* add automatic model download support ([c8bd15d](https://github.com/kuma-00/Mogu2/commit/c8bd15db4ec72f07b856ef1e2cb6d8baab9eff60))

## [1.0.11](https://github.com/kuma-00/Mogu2/compare/v1.0.10...v1.0.11) (2026-07-28)


### Continuous Integration

* publish npm packages with OIDC only ([b641835](https://github.com/kuma-00/Mogu2/commit/b64183598815f9bd117a3b83aa8cc47bf1da5558))

## [1.0.10](https://github.com/kuma-00/Mogu2/compare/v1.0.9...v1.0.10) (2026-07-28)


### Bug Fixes

* run npm pack through cmd on Windows ([3b198bc](https://github.com/kuma-00/Mogu2/commit/3b198bc741ccfd4bb38234c8569c28b920b9dc6e))

## [1.0.9](https://github.com/kuma-00/Mogu2/compare/v1.0.8...v1.0.9) (2026-07-28)


### Bug Fixes

* invoke npm correctly on Windows ([8a43049](https://github.com/kuma-00/Mogu2/commit/8a43049c5ccc8d596b5ea5bbcf79c562f8edb99f))

## [1.0.8](https://github.com/kuma-00/Mogu2/compare/v1.0.7...v1.0.8) (2026-07-28)


### Bug Fixes

* expose npm environment secret to publish jobs ([7388354](https://github.com/kuma-00/Mogu2/commit/738835413781243fec7f24f0c187bb0d15b8ec73))

## [1.0.7](https://github.com/kuma-00/Mogu2/compare/v1.0.6...v1.0.7) (2026-07-28)


### Bug Fixes

* normalize npm registry validation ([4a6733d](https://github.com/kuma-00/Mogu2/commit/4a6733d576f1325f973346df0a762c4f86f27013))

## [1.0.6](https://github.com/kuma-00/Mogu2/compare/v1.0.5...v1.0.6) (2026-07-28)


### Continuous Integration

* support token and OIDC npm publishing ([79ff7bb](https://github.com/kuma-00/Mogu2/commit/79ff7bb3ca7ae862bc91f01863c1008d5c4a52ad))

## [1.0.5](https://github.com/kuma-00/Mogu2/compare/v1.0.4...v1.0.5) (2026-07-28)


### Code Refactoring

* simplify publish script and integrate registry checks into release workflow ([f640b9f](https://github.com/kuma-00/Mogu2/commit/f640b9f71cf9d39b9875172d9fe32b716bda2541))


### Continuous Integration

* publish packages to npm with trusted publishing ([28576e1](https://github.com/kuma-00/Mogu2/commit/28576e145841e406f8d3763963499f5187027fbd))

## [1.0.4](https://github.com/kuma-00/Mogu2/compare/v1.0.3...v1.0.4) (2026-06-24)


### Code Refactoring

* migrate native build and publish logic from publish workflow into release-please workflow ([de3e83c](https://github.com/kuma-00/Mogu2/commit/de3e83c47e5153ec20673a931a4cf7aeb6cd9f3f))

## [1.0.3](https://github.com/kuma-00/Mogu2/compare/v1.0.2...v1.0.3) (2026-06-24)


### Code Refactoring

* simplify FoodKind union type by consolidating and renaming categories ([47b8cfc](https://github.com/kuma-00/Mogu2/commit/47b8cfced304049245e0128afc36562bc02cd283))


### Miscellaneous

* add deps to commit search pattern in release configuration ([fc2e0d6](https://github.com/kuma-00/Mogu2/commit/fc2e0d6d486e410ba67ba662c6f6d99f33c47242))
* bump project version to 1.0.2 and remove unused hello function ([c6ffe13](https://github.com/kuma-00/Mogu2/commit/c6ffe135a5cf542cc82b95d1a7b2f24991694a34))
* remove @changesets/cli and unused dependencies from lockfile ([82db098](https://github.com/kuma-00/Mogu2/commit/82db09861f4d446e0e218f6385175d22582dcded))
* replace changesets with release-please for automated versioning and release management ([186d892](https://github.com/kuma-00/Mogu2/commit/186d8922a219ebe713e38be8ace80e9c870686a8))
