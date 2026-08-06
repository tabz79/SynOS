# Task: Redesign the PACS DICOM Import Pipeline (Enterprise Grade)

The recent bug exposed architectural weaknesses in the import pipeline. I do **not** want a patch that merely fixes duplicate `PacsSeries` rows. I want the importer redesigned so it behaves like an enterprise PACS.

## Goals

* Preserve the DICOM hierarchy exactly as it exists.
* Prevent database corruption.
* Make imports repeatable and safe.
* Never rely on UI workarounds to hide bad data.

---

## Required Design

### 1. Build the hierarchy in memory first

Do **not** query the database for every image.

When importing a folder or ZIP:

* Read every DICOM.
* Build the complete hierarchy in memory.

Example:

```
Study
    Series A
        Images...

    Series B
        Images...

    Series C
        Images...
```

Group by:

* StudyInstanceUID
* SeriesInstanceUID
* SOPInstanceUID

Only after the hierarchy is complete should database writes begin.

---

### 2. Single transaction

Import must occur inside one database transaction.

```
Begin Transaction

Create Study

Create Series

Create Images

Commit
```

If a fatal error occurs, rollback everything.

Never leave half-imported studies.

---

### 3. Eliminate N+1 queries

Do not perform SQL lookups for every image.

Maintain an in-memory lookup (Dictionary or equivalent) while importing.

Database access should be minimized.

---

### 4. Database integrity

Add database protection.

Create a UNIQUE constraint so duplicate series for the same study cannot exist.

If duplicate data already exists, create a migration strategy instead of forcing the constraint immediately.

---

### 5. Idempotent imports

If the same study is imported twice:

* do not duplicate studies
* do not duplicate series
* do not duplicate instances

The importer should detect existing objects and reuse or skip them.

---

### 6. Validation levels

Separate validation into three categories.

#### Fatal

Reject import.

Examples:

* Missing StudyInstanceUID
* Missing SeriesInstanceUID
* Missing SOPInstanceUID
* Corrupted DICOM
* Invalid pixel data

Rollback transaction.

---

#### Warning

Import continues.

Examples:

* Missing patient age
* Missing referring doctor
* Missing institution
* Missing comments

---

#### Auto Skip

If duplicate SOP Instance UID is encountered:

Skip that instance.

Continue importing the remaining images.

---

### 7. Import summary

Every import should generate a structured summary.

Example:

```
Study:
MRI Brain

Series:
4

Images Imported:
589

Images Skipped:
2

Warnings:
1

Errors:
0

Import Duration:
4.3 seconds
```

This should be available to the technician after import.

---

### 8. Preserve DICOM hierarchy

The importer must never invent or split series.

If the source DICOM contains:

```
Study
 ├── Series A (96)
 ├── Series B (15)
 ├── Series C (7)
 └── Series D (96)
```

SynOS must store exactly:

```
Study
 ├── Series A (96)
 ├── Series B (15)
 ├── Series C (7)
 └── Series D (96)
```

The viewer should simply render what the database contains.

No synthetic grouping.
No fallback grouping.
No UI masking.

---

### 9. Backward compatibility

If existing studies are already corrupted (duplicate `PacsSeries` rows), propose a repair or migration strategy before enabling the UNIQUE constraint.

---

### Deliverables

Before writing code, provide:

1. The proposed import pipeline.
2. Database changes.
3. Validation strategy.
4. Repair strategy for existing corrupted data.
5. Rollback strategy.
6. Performance impact for studies with 5,000+ images.

---

