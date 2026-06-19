# SynOS Catalog Import Minimum Required Fields Reference

This document maps out the fields, defaults, and workflow dependencies verified against the importer and provisioning pipelines.

---

## 1. Sheet Mapping Details

### Sheet: `ServiceCategories`
* **Mandatory columns**: `Code`
* **Optional columns**: `Name`
* **Default values applied if blank**:
  * `Name`: Defaults to `Code`
* **Downstream Workflow Dependency**:
  * `Code`: **Queue Routing** (groups processing departments under a macro service category).

### Sheet: `ProcessingDepartments`
* **Mandatory columns**: `Code`
* **Optional columns**: `Name`, `CategoryCode`, `RequiresSpecimen`
* **Default values applied if blank**:
  * `Name`: Defaults to `Code`
  * `CategoryCode`: Defaults to `LAB`
  * `RequiresSpecimen`: Defaults to `True`
* **Downstream Workflow Dependency**:
  * `Code`: **Queue Routing**, **Analyzer Routing**
  * `RequiresSpecimen`: **Specimen Collection** (controls whether samples must be checked in)

### Sheet: `SpecimenTypes`
* **Mandatory columns**: `Code`
* **Optional columns**: `Name`
* **Default values applied if blank**:
  * `Name`: Defaults to `Code`
* **Downstream Workflow Dependency**:
  * `Code`: **Specimen Collection**, **Inventory** (consumables map to specific matrices)

### Sheet: `TubeTypes`
* **Mandatory columns**: `Code`
* **Optional columns**: `Name`
* **Default values applied if blank**:
  * `Name`: Defaults to `Code`
* **Downstream Workflow Dependency**:
  * `Code`: **Tube Assignment**, **Inventory**

### Sheet: `Tests`
* **Mandatory columns**: `Code`
* **Optional columns**: `Name`, `DepartmentCode`, `SpecimenCode`, `TubeCode`, `Price`, `IsPanel`
* **Default values applied if blank**:
  * `Name`: Defaults to `Code`
  * `Price`: Defaults to `0`
  * `IsPanel`: Defaults to `False`
* **Downstream Workflow Dependency**:
  * `Code`: **Billing**, **Reporting**
  * `DepartmentCode`: **Queue Routing**
  * `SpecimenCode` & `TubeCode`: **Specimen Collection**, **Tube Assignment**, **Inventory**
  * `Price`: **Billing**

### Sheet: `PanelMappings`
* **Mandatory columns**: `PanelCode`, `ChildCode`
* **Optional columns**: `SortOrder`
* **Default values applied if blank**:
  * `SortOrder`: Defaults to `1`
* **Downstream Workflow Dependency**:
  * `PanelCode` & `ChildCode`: **Reporting** (explodes order panels into component parameter list)

### Sheet: `Parameters`
* **Mandatory columns**: `TestCode`, `ParamCode`, `ParamName`
* **Optional columns**: `DataType`, `Unit`, `Range`, `SortOrder`, `IsRequired`, `EnumOptions`, `PrintName`, `Methodology`, `DisplayGroup`, `DisplayGroupOrder`, `IsCalculated`, `DecimalPlaces`, `Formula`
* **Default values applied if blank**:
  * `DataType`: Defaults to `Numeric`
  * `SortOrder`: Auto-incrementing counter per test
  * `IsRequired`: Defaults to `True`
  * `PrintName`: Falls back to `ParamName`
  * `IsCalculated`: Defaults to `False`
  * `DecimalPlaces`: Defaults to `2`
* **Downstream Workflow Dependency**:
  * `ParamCode`: **Analyzer Routing** (channels query using ParamCode)
  * `DataType`, `Unit`, `IsCalculated`, `Formula`: **Reporting**

### Sheet: `ReferenceRanges`
* **Mandatory columns**: `TestCode`, `ParameterCode`
* **Optional columns**: `Sex`, `AgeMin`, `AgeMax`, `RefLow`, `RefHigh`, `CriticalLow`, `CriticalHigh`, `TextRange`, `EffectiveFrom`, `EffectiveTo`, `IsActive`
* **Default values applied if blank**:
  * `Sex`: Defaults to `ALL`
  * `EffectiveFrom`: Defaults to Current Date
  * `IsActive`: Defaults to `True`
* **Downstream Workflow Dependency**:
  * `Sex`, `AgeMin`, `AgeMax`, `RefLow`, `RefHigh`, `CriticalLow`, `CriticalHigh`, `TextRange`: **Reporting** (critical pathology validation alerts)

---

## 2. Laboratory Import Feasibility Check

A laboratory test **can** be imported successfully with only:
* `DepartmentCode`
* `SpecimenCode`
* `TubeCode`

and no additional workflow configuration. However, for phlebotomy and specimen processing workflows to function correctly downstream, the following fields must be populated:
1. `Tests.SpecimenCode` (must link to a valid code in `SpecimenTypes`)
2. `Tests.TubeCode` (must link to a valid code in `TubeTypes`)
3. `ProcessingDepartments.RequiresSpecimen` (must be set to `True` or left blank so it defaults to `True`)
4. `Tests.DepartmentCode` (must link to a valid code in `ProcessingDepartments`)
