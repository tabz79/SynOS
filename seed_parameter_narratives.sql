-- Update Catalog_Parameters
UPDATE Catalog_Parameters
SET ShowNarrative = 1,
    Unit = 'ng/ml',
    NarrativeTemplate = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Adults:","marks":[{"type":"bold"}]}]},{"type":"paragraph","content":[{"type":"text","text":"20–50 Yrs: 0.70 – 2.15 ng/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"50–90 Yrs: 0.40 – 1.81 ng/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"Paediatric Range:","marks":[{"type":"bold"}]}]},{"type":"paragraph","content":[{"type":"text","text":"Cord Blood: 0.30 – 0.70 ng/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"New Born: 0.75 – 2.60 ng/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"1–5 Yrs: 1.0 – 2.60 ng/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"5–10 Yrs: 0.90 – 2.40 ng/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"10–20 Yrs: 0.80 – 2.10 ng/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"Pregnancy:","marks":[{"type":"bold"}]}]},{"type":"paragraph","content":[{"type":"text","text":"First trimester: 0.81 – 1.90 ng/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"Second & third trimesters: 1.0 – 2.60 ng/ml"}]}]}'
WHERE TestCode = 'T3_T4_TSH' AND ParameterCode = 'TOTAL_T3';

UPDATE Catalog_Parameters
SET ShowNarrative = 1,
    Unit = 'µg/dl',
    NarrativeTemplate = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Adults: 5.2 – 12.7 µg/dl","marks":[{"type":"bold"}]}]},{"type":"paragraph","content":[{"type":"text","text":"Paediatric Ranges:","marks":[{"type":"bold"}]}]},{"type":"paragraph","content":[{"type":"text","text":"1 – 3 Days: 8.2–19.9 µg/dl"}]},{"type":"paragraph","content":[{"type":"text","text":"1 Week: 6.0–15.9 µg/dl"}]},{"type":"paragraph","content":[{"type":"text","text":"1–12 Months: 6.1–14.9 µg/dl"}]},{"type":"paragraph","content":[{"type":"text","text":"1 – 3 Yrs: 6.8–13.5 µg/dl"}]},{"type":"paragraph","content":[{"type":"text","text":"3 – 10 Yrs: 5.5–12.8 µg/dl"}]}]}'
WHERE TestCode = 'T3_T4_TSH' AND ParameterCode = 'TOTAL_T4';

UPDATE Catalog_Parameters
SET ShowNarrative = 1,
    Unit = 'µIU/ml',
    NarrativeTemplate = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"21 Weeks – 20 Years: 0.70 – 6.40 µIU/ml","marks":[{"type":"bold"}]}]},{"type":"paragraph","content":[{"type":"text","text":"21 – 54 Yrs: 0.4 – 4.5 µIU/ml","marks":[{"type":"bold"}]}]},{"type":"paragraph","content":[{"type":"text","text":"55 – 87 Yrs: 0.5 – 8.9 µIU/ml","marks":[{"type":"bold"}]}]},{"type":"paragraph","content":[{"type":"text","text":"Pregnancy:","marks":[{"type":"bold"}]}]},{"type":"paragraph","content":[{"type":"text","text":"1st Trimester: 0.3 – 4.5 µIU/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"2nd Trimester: 0.5 – 4.6 µIU/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"3rd Trimester: 0.8 – 5.2 µIU/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"Paediatric Ranges:","marks":[{"type":"bold"}]}]},{"type":"paragraph","content":[{"type":"text","text":"Cord Blood: 2.3 – 13.2 µIU/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"1-2 Days: 3.2 – 34.6 µIU/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"3-4 Days: 0.7 – 15.4 µIU/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"2-20 Weeks: 1.7 – 9.1 µIU/ml"}]}]}'
WHERE TestCode = 'T3_T4_TSH' AND ParameterCode = 'TSH';

-- Update Parameters
UPDATE Parameters
SET ShowNarrative = 1,
    Unit = 'ng/ml',
    NarrativeTemplate = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Adults:","marks":[{"type":"bold"}]}]},{"type":"paragraph","content":[{"type":"text","text":"20–50 Yrs: 0.70 – 2.15 ng/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"50–90 Yrs: 0.40 – 1.81 ng/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"Paediatric Range:","marks":[{"type":"bold"}]}]},{"type":"paragraph","content":[{"type":"text","text":"Cord Blood: 0.30 – 0.70 ng/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"New Born: 0.75 – 2.60 ng/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"1–5 Yrs: 1.0 – 2.60 ng/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"5–10 Yrs: 0.90 – 2.40 ng/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"10–20 Yrs: 0.80 – 2.10 ng/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"Pregnancy:","marks":[{"type":"bold"}]}]},{"type":"paragraph","content":[{"type":"text","text":"First trimester: 0.81 – 1.90 ng/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"Second & third trimesters: 1.0 – 2.60 ng/ml"}]}]}'
WHERE ParameterCode = 'TOTAL_T3' AND TestId IN (SELECT TestId FROM Tests WHERE TestCode = 'T3_T4_TSH');

UPDATE Parameters
SET ShowNarrative = 1,
    Unit = 'µg/dl',
    NarrativeTemplate = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Adults: 5.2 – 12.7 µg/dl","marks":[{"type":"bold"}]}]},{"type":"paragraph","content":[{"type":"text","text":"Paediatric Ranges:","marks":[{"type":"bold"}]}]},{"type":"paragraph","content":[{"type":"text","text":"1 – 3 Days: 8.2–19.9 µg/dl"}]},{"type":"paragraph","content":[{"type":"text","text":"1 Week: 6.0–15.9 µg/dl"}]},{"type":"paragraph","content":[{"type":"text","text":"1–12 Months: 6.1–14.9 µg/dl"}]},{"type":"paragraph","content":[{"type":"text","text":"1 – 3 Yrs: 6.8–13.5 µg/dl"}]},{"type":"paragraph","content":[{"type":"text","text":"3 – 10 Yrs: 5.5–12.8 µg/dl"}]}]}'
WHERE ParameterCode = 'TOTAL_T4' AND TestId IN (SELECT TestId FROM Tests WHERE TestCode = 'T3_T4_TSH');

UPDATE Parameters
SET ShowNarrative = 1,
    Unit = 'µIU/ml',
    NarrativeTemplate = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"21 Weeks – 20 Years: 0.70 – 6.40 µIU/ml","marks":[{"type":"bold"}]}]},{"type":"paragraph","content":[{"type":"text","text":"21 – 54 Yrs: 0.4 – 4.5 µIU/ml","marks":[{"type":"bold"}]}]},{"type":"paragraph","content":[{"type":"text","text":"55 – 87 Yrs: 0.5 – 8.9 µIU/ml","marks":[{"type":"bold"}]}]},{"type":"paragraph","content":[{"type":"text","text":"Pregnancy:","marks":[{"type":"bold"}]}]},{"type":"paragraph","content":[{"type":"text","text":"1st Trimester: 0.3 – 4.5 µIU/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"2nd Trimester: 0.5 – 4.6 µIU/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"3rd Trimester: 0.8 – 5.2 µIU/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"Paediatric Ranges:","marks":[{"type":"bold"}]}]},{"type":"paragraph","content":[{"type":"text","text":"Cord Blood: 2.3 – 13.2 µIU/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"1-2 Days: 3.2 – 34.6 µIU/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"3-4 Days: 0.7 – 15.4 µIU/ml"}]},{"type":"paragraph","content":[{"type":"text","text":"2-20 Weeks: 1.7 – 9.1 µIU/ml"}]}]}'
WHERE ParameterCode = 'TSH' AND TestId IN (SELECT TestId FROM Tests WHERE TestCode = 'T3_T4_TSH');
