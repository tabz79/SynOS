|Column_name|Type|Computed|Length|Prec|Scale|Nullable|TrimTrailingBlanks|FixedLenNullInSource|Collation|
|---|---|---|---|---|---|---|---|---|---|
|ReportId|uniqueidentifier|no|16|     |     |no|(n/a)|(n/a)|NULL|
|OrderId|uniqueidentifier|no|16|     |     |no|(n/a)|(n/a)|NULL|
|Status|nvarchar|no|100|     |     |no|(n/a)|(n/a)|SQL_Latin1_General_CP1_CI_AS|
|SignedByUserId|uniqueidentifier|no|16|     |     |yes|(n/a)|(n/a)|NULL|
|SignedAt|datetimeoffset|no|10|34   |7    |yes|(n/a)|(n/a)|NULL|
|PathologistComments|nvarchar|no|-1|     |     |yes|(n/a)|(n/a)|SQL_Latin1_General_CP1_CI_AS|
|Interpretation|nvarchar|no|-1|     |     |yes|(n/a)|(n/a)|SQL_Latin1_General_CP1_CI_AS|
|Recommendations|nvarchar|no|-1|     |     |yes|(n/a)|(n/a)|SQL_Latin1_General_CP1_CI_AS|
|CurrentVersion|int|no|4|10   |0    |no|(n/a)|(n/a)|NULL|
|Delivered|bit|no|1|     |     |no|(n/a)|(n/a)|NULL|
|DeliveredAt|datetimeoffset|no|10|34   |7    |yes|(n/a)|(n/a)|NULL|
