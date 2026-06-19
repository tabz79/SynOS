# Migration Transformation Summary

- **Total Rows Scanned**: 1160
- **Successfully Transformed tests/parameters**: 1923
- **Rows rejected (written to Migration_Errors.xlsx)**: 0

## Breakdown

- **Service Categories added**: 2 (`LAB`, `RAD`)
- **Departments added**: 12
- **Unique Tests added**: 1148
- **Unique Parameters added**: 1923
- **Reference Ranges created**: 488
- **Panel Mappings created**: 25

*Note: Strict validation was used. Specimen or tube mapping was never guessed. Mappings were derived from existing database seeds or explicit text matches. All other laboratory records requiring speculation have been isolated in `Migration_Errors.xlsx`.*
