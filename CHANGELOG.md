# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.2 - 2023-04-24

### Changed

- Rebuilt and renamed `./node-tasks.js` and `./node-my-theme.js` to `./build.js` and `./build-my-theme.js` respectively and moved them over to `./scripts` directory.
- Renamed `./tests` directory to `./test`.
- Amended line length formatting in the [LICENSE](LICENSE) file.
- Upgraded Node dependencies to their latest versions.
- Recompiled source code.

### Added

- Added `.vscode` special directory with [`tasks.json`](./.vscode/tasks.json) inside.
- Added `scripts/` directory which contains automation task scripts or utility scripts that automate or facilitate various development and maintenance tasks related to the project.
- The project now uses git and is in [GitHub](https://github.com/TomasBagdanavicius).

## 1.0.1 - 2022-06-06

### Added

- This CHANGELOG.md file in order to document current and future changes to this project.

### Changed

- Bug fix: the back button in the navigation menu bar will now show correct advisory information via the `title` attribute.
- Upgraded Node dependencies to their latest versions.
- Recompiled source code.