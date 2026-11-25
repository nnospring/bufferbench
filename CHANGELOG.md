# Changelog

All notable changes are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
versions follow [Semantic Versioning](https://semver.org/). Note and error codes are part of the public interface.

## [0.1.0] - unreleased

First release.

### Added

- Library, command-line tool and web app (English and Chinese).
- 64 acid–base systems from the NIST evaluation of Goldberg, Kishore & Lennen (2002) and 75 reagents.
- Equilibrium solver with temperature-dependent constants (van 't Hoff with ΔCp), Davies, Bates–Guggenheim and
  ideal-solution activity models, and IAPWS water properties.
- Recipes by titration or by mixing two forms, with salts, stocks and the meter readings to expect while preparing.
- pH prediction for arbitrary mixtures, buffer capacity, dpH/dT and speciation; buffer suggestions for a target pH.
- Benchmark against six NIST certified pH standards (62 values, 0–50 °C), regenerated and checked in CI.
