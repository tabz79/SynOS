# SynOS 1200-Test Catalog Migration Guide

This guide details how columns from your existing workbook map into the new `SynOS_Catalog_Master_Template.xlsx` sheets.

---

## 1. Sheet Mapping Index

### Sheet 1: `ServiceCategories`
* **Purpose**: Defines broad diagnostic groups (e.g., Laboratory, Radiology, Cardiology).
* **Mappings**:
  * `Code` ➔ Unique code identifier (e.g., `LAB`, `RAD`).
  * `Name` ➔ Display name (e.g., `Laboratory Diagnostics`, `Radiology Imaging`).

### Sheet 2: `ProcessingDepartments`
* **Purpose**: Processing location and department routing.
* **Mappings**:
  * `Code` ➔ Department code (e.g., `BIO`, `HEM`).
  * `Name` ➔ Department name.
  * `CategoryCode` ➔ Category code linking back to `ServiceCategories` (e.g., `LAB`).
  * `RequiresSpecimen` ➔ Set to `True` for lab testing, `False` for radiology.

### Sheet 3: `SpecimenTypes`
* **Purpose**: Master list of specimen/sample matrices.
* **Mappings**:
  * `Code` ➔ Unique specimen identifier (e.g., `SERUM`, `EDTA`).
  * `Name` ➔ Specimen type name (e.g., `Serum`, `EDTA Whole Blood`).

### Sheet 4: `TubeTypes`
* **Purpose**: Phlebotomy materials and container identifiers.
* **Mappings**:
  * `Code` ➔ Unique container code (e.g., `SST`, `EDT`).
  * `Name` ➔ Display description (e.g., `Serum Separator Tube`, `Purple Tube`).

### Sheet 5: `Tests`
* **Purpose**: Test master catalog definitions.
* **Mappings**:
  * `Code` ➔ Your unique test catalog code (e.g., `GLU`, `LFT`).
  * `Name` ➔ Catalog test print name.
  * `DepartmentCode` ➔ Department code mapping.
  * `SpecimenCode` ➔ Specimen code mapping (mandatory for lab tests).
  * `TubeCode` ➔ Tube/Container code mapping (mandatory for lab tests).
  * `Price` ➔ Base price.
  * `IsPanel` ➔ `True` for profiles/panels containing multiple parameters, `False` for single test parameters.

### Sheet 6: `PanelMappings`
* **Purpose**: Child mappings for panels/profiles.
* **Mappings**:
  * `PanelCode` ➔ Master panel/profile code (e.g., `LFT`).
  * `ChildCode` ➔ Child test code belonging to the panel.
  * `SortOrder` ➔ Positional hierarchy (1, 2, 3, etc.).

### Sheet 7: `Parameters`
* **Purpose**: Diagnostic test parameters and calculated formulas.
* **Mappings**:
  * `TestCode` ➔ Catalog test code mapping (e.g., `GLU`).
  * `ParamCode` ➔ Unique code of the parameter (e.g., `GLU`).
  * `ParamName` ➔ Printable name.
  * `DataType` ➔ `Numeric`, `Enum`, or `Text`.
  * `Unit` ➔ Measurement unit.
  * `Range` ➔ Legacy fallback text range.
  * `SortOrder` ➔ Display sort order.
  * `IsRequired` ➔ `True`/`False` response requirement.
  * `EnumOptions` ➔ Qualitative options (comma-separated, e.g., `Reactive,Non-Reactive`).
  * `PrintName` ➔ Display title in patient reports.
  * `Methodology` ➔ Test method description.
  * `DisplayGroup` ➔ Section naming grouping.
  * `DisplayGroupOrder` ➔ Sequence priority of display groupings.
  * `IsCalculated` ➔ `True`/`False` flag indicating a derived parameter.
  * `DecimalPlaces` ➔ Precision formatting.
  * `Formula` ➔ Mathematical calculation syntax (e.g., `TP-ALB`).

### Sheet 8: `ReferenceRanges`
* **Purpose**: Sex- and age-bound demographic references.
* **Mappings**:
  * `TestCode` ➔ Test catalog mapping (e.g., `GLU`).
  * `ParameterCode` ➔ Parameter code mapping (e.g., `GLU`).
  * `Sex` ➔ `ALL`, `Male`, or `Female`.
  * `AgeMin` ➔ Lower age bound (in years, e.g., `18`).
  * `AgeMax` ➔ Upper age bound (in years, e.g., `120`).
  * `RefLow` ➔ Minimum normal value.
  * `RefHigh` ➔ Maximum normal value.
  * `CriticalLow` ➔ Threshold for critical low alerts.
  * `CriticalHigh` ➔ Threshold for critical high alerts.
  * `TextRange` ➔ Text/Qualitative fallback range.
  * `EffectiveFrom` ➔ Effective calendar date start.
  * `EffectiveTo` ➔ Effective calendar date end (optional).
  * `IsActive` ➔ `True` or `False`.
