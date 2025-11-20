first and 2nd execute both returned 200
console logs:
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> dotnet run --urls "http://127.0.0.1:59999"
[15:27:13 INF] ExpiredLockCleanupService is starting.
[15:27:13 INF] ExpiredLockCleanupService is starting.
[15:28:13 WRN] Failed to determine the https port for redirect.
[15:28:13 WRN] Failed to determine the https port for redirect.
[15:28:14 WRN] Savepoints are disabled because Multiple Active Result Sets (MARS) is enabled. If 'SaveChanges' fails, then the transaction cannot be automatically rolled back to a known clean state. Instead, the transaction should be rolled back by the application before retrying 'SaveChanges'. See https://go.microsoft.com/fwlink/?linkid=2149338 for more information and examples. To identify the code which triggers this warning, call 'ConfigureWarnings(w => w.Throw(SqlServerEventId.SavepointsDisabledBecauseOfMARS))'.
[15:28:14 WRN] Savepoints are disabled because Multiple Active Result Sets (MARS) is enabled. If 'SaveChanges' fails, then the transaction cannot be automatically rolled back to a known clean state. Instead, the transaction should be rolled back by the application before retrying 'SaveChanges'. See https://go.microsoft.com/fwlink/?linkid=2149338 for more information and examples. To identify the code which triggers this warning, call 'ConfigureWarnings(w => w.Throw(SqlServerEventId.SavepointsDisabledBecauseOfMARS))'.


You said:
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $server = "(localdb)\MSSQLLocalDB"
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $database = "SynOSDb"
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $email = "dev@local"
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $name = "Dev User (local)"
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $passwordHash = "dev-placeholder-hash"  # not used for local tests; must be non-null
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cs = "Server=$server;Database=$database;Trusted_Connection=True;"
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api>
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> # helper
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> function ExecScalar($sql) {
>>   $cn = New-Object System.Data.SqlClient.SqlConnection $cs
>>   $cmd = $cn.CreateCommand()
>>   $cmd.CommandText = $sql
>>   $cn.Open()
>>   $res = $cmd.ExecuteScalar()
>>   $cn.Close()
>>   return $res
>> }
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api>
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> # 1) check existing
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $check = "SELECT UserId FROM dbo.Users WHERE Email = '$email';"
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $res = ExecScalar $check
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api>
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> if ($res -ne $null) {
>>   Write-Host "Existing dev user found:" $res
>>   exit 0
>> }
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api>
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> # 2) insert new user and return new id
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $newId = [guid]::NewGuid().ToString()
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $createdAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss.fffffff")
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $insert = @"
>> INSERT INTO dbo.Users (UserId, Email, PasswordHash, Name, IsActive, CreatedAt, FailedLoginAttempts)
>> VALUES ('${newId}', '${email}', '${passwordHash}', '${name}', 1, '${createdAt}', 0);
>> SELECT '${newId}';
>> "@
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api>
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $res2 = ExecScalar $insert
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> Write-Host "Inserted dev user id:" $res2
Inserted dev user id: 6cc795ac-c3c1-4a49-b110-a2da5e2a2fc2
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $server="(localdb)\MSSQLLocalDB"
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $db="SynOSDb"
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $query = @"
>> SELECT LockId, EntityType, EntityId, LockedByUserId, LockedAt, ExpiresAt, Status
>> FROM dbo.EditLocks
>> WHERE EntityType = 'Visit' AND EntityId = '11111111-2222-3333-4444-555555555555'
>> ORDER BY LockedAt DESC;
>> "@
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cs = "Server=$server;Database=$db;Trusted_Connection=True;"
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cn = New-Object System.Data.SqlClient.SqlConnection $cs
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cmd = $cn.CreateCommand()
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cmd.CommandText = $query
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cn.Open()
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $da = New-Object System.Data.SqlClient.SqlDataAdapter $cmd
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $dt = New-Object System.Data.DataTable
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $da.Fill($dt) | Out-Null
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cn.Close()
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $dt | Format-Table -AutoSize

LockId                               EntityType EntityId                             LockedBy
                                                                                     UserId
------                               ---------- --------                             --------
184ecadd-f5e4-4585-94a2-84efb78772e4 Visit      11111111-2222-3333-4444-555555555555 6cc79...
a99a37f9-6f63-49fd-8b54-6af51855e5e7 Visit      11111111-2222-3333-4444-555555555555 6cc79...
af6fd7db-b8dc-4b1d-80cc-4882b95458ca Visit      11111111-2222-3333-4444-555555555555 6cc79...


PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $server="(localdb)\MSSQLLocalDB"
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $db="SynOSDb"
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $query = @"
>> SELECT name, is_unique, filter_definition
>> FROM sys.indexes
>> WHERE object_id = OBJECT_ID('dbo.EditLocks');
>> "@
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cs = "Server=$server;Database=$db;Trusted_Connection=True;"
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cn = New-Object System.Data.SqlClient.SqlConnection $cs
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cmd = $cn.CreateCommand()
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cmd.CommandText = $query
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cn.Open()
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $da = New-Object System.Data.SqlClient.SqlDataAdapter $cmd
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $dt = New-Object System.Data.DataTable
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $da.Fill($dt) | Out-Null
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cn.Close()
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $dt | Format-Table -AutoSize

name                                    is_unique filter_definition
----                                    --------- -----------------
PK_EditLocks                                 True
IX_EditLocks_EntityType_EntityId_Active      True ([Status]='Active')
IX_EditLocks_ExpiresAt                      False
IX_EditLocks_LockedByUserId                 False


PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api>
You said:
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $server="(localdb)\MSSQLLocalDB"; $db="SynOSDb"
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $q = @"
>> SELECT LockId, EntityType, EntityId, LockedByUserId,
>>        CONVERT(varchar(40), LockedAt, 121) AS LockedAt_UTC,
>>        CONVERT(varchar(40), ExpiresAt, 121) AS ExpiresAt_UTC,
>>        Status, DATALENGTH(Status) AS StatusLength
>> FROM dbo.EditLocks
>> WHERE EntityType='Visit' AND EntityId='11111111-2222-3333-4444-555555555555'
>> ORDER BY LockedAt DESC;
>> "@
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cs = "Server=$server;Database=$db;Trusted_Connection=True;"
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $dt = Invoke-Sqlcmd -Query $q -ServerInstance $server -Database $db -ErrorAction Stop
Invoke-Sqlcmd : The term 'Invoke-Sqlcmd' is not recognized as the name of a cmdlet,
function, script file, or operable program. Check the spelling of the name, or if a path was
included, verify that the path is correct and try again.
At line:1 char:7
+ $dt = Invoke-Sqlcmd -Query $q -ServerInstance $server -Database $db - ...
+       ~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (Invoke-Sqlcmd:String) [], CommandNotFoundExce
   ption
    + FullyQualifiedErrorId : CommandNotFoundException

PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $dt | Format-Table -AutoSize

name                                    is_unique filter_definition
----                                    --------- -----------------
PK_EditLocks                                 True
IX_EditLocks_EntityType_EntityId_Active      True ([Status]='Active')
IX_EditLocks_ExpiresAt                      False
IX_EditLocks_LockedByUserId                 False


PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cn = New-Object System.Data.SqlClient.SqlConnection $cs
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cmd = $cn.CreateCommand()
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cmd.CommandText = $q
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cn.Open()
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $da = New-Object System.Data.SqlClient.SqlDataAdapter $cmd
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $dt = New-Object System.Data.DataTable
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $da.Fill($dt) | Out-Null
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cn.Close()
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $dt | Format-Table -AutoSize

LockId                               EntityType EntityId                             LockedBy
                                                                                     UserId
------                               ---------- --------                             --------
184ecadd-f5e4-4585-94a2-84efb78772e4 Visit      11111111-2222-3333-4444-555555555555 6cc79...
a99a37f9-6f63-49fd-8b54-6af51855e5e7 Visit      11111111-2222-3333-4444-555555555555 6cc79...
af6fd7db-b8dc-4b1d-80cc-4882b95458ca Visit      11111111-2222-3333-4444-555555555555 6cc79...


PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $q2 = @"
>> SELECT COUNT(*) AS ActiveCount
>> FROM dbo.EditLocks
>> WHERE EntityType='Visit' AND EntityId='11111111-2222-3333-4444-555555555555'
>>   AND Status = 'Active' AND ExpiresAt > SYSUTCDATETIME();
>> "@
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cn = New-Object System.Data.SqlClient.SqlConnection $cs
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cmd = $cn.CreateCommand()
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cmd.CommandText = $q2
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cn.Open()
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $active = $cmd.ExecuteScalar()
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cn.Close()
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> "ActiveCount: $active"
ActiveCount: 0
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api>
You said:
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $server="(localdb)\MSSQLLocalDB"; $db="SynOSDb"
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cs = "Server=$server;Database=$db;Trusted_Connection=True;"
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $q = @"
>> SELECT
>>   SYSUTCDATETIME() AS DbNow_UTC,
>>   LockId,
>>   EntityType,
>>   EntityId,
>>   LockedByUserId,
>>   CONVERT(varchar(40), LockedAt, 121) AS LockedAt_UTC,
>>   CONVERT(varchar(40), ExpiresAt, 121) AS ExpiresAt_UTC,
>>   Status,
>>   DATALENGTH(Status) AS StatusLength
>> FROM dbo.EditLocks
>> WHERE EntityType='Visit' AND EntityId='11111111-2222-3333-4444-555555555555'
>> ORDER BY LockedAt DESC;
>> "@
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api>
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cn = New-Object System.Data.SqlClient.SqlConnection $cs
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cmd = $cn.CreateCommand()
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cmd.CommandText = $q
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cn.Open()
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $da = New-Object System.Data.SqlClient.SqlDataAdapter $cmd
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $dt = New-Object System.Data.DataTable
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $da.Fill($dt) | Out-Null
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cn.Close()
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $dt | Format-Table -AutoSize

DbNow_UTC           LockId                               EntityType EntityId
---------           ------                               ---------- --------
20-11-2025 10:29:23 184ecadd-f5e4-4585-94a2-84efb78772e4 Visit      11111111-2222-3333-444...
20-11-2025 10:29:23 a99a37f9-6f63-49fd-8b54-6af51855e5e7 Visit      11111111-2222-3333-444...
20-11-2025 10:29:23 af6fd7db-b8dc-4b1d-80cc-4882b95458ca Visit      11111111-2222-3333-444...


PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api>
You said:
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $server="(localdb)\MSSQLLocalDB"; $db="SynOSDb"
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cs = "Server=$server;Database=$db;Trusted_Connection=True;"
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $q = @"
>> SELECT
>>   SYSUTCDATETIME() AS DbNow_UTC,
>>   LockId,
>>   EntityType,
>>   EntityId,
>>   LockedByUserId,
>>   CONVERT(varchar(40), LockedAt, 121) AS LockedAt_UTC,
>>   CONVERT(varchar(40), ExpiresAt, 121) AS ExpiresAt_UTC,
>>   Status,
>>   DATALENGTH(Status) AS StatusLength
>> FROM dbo.EditLocks
>> WHERE EntityType='Visit' AND EntityId='11111111-2222-3333-4444-555555555555'
>> ORDER BY LockedAt DESC;
>> "@
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api>
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cn = New-Object System.Data.SqlClient.SqlConnection $cs
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cmd = $cn.CreateCommand()
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cmd.CommandText = $q
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cn.Open()
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $da = New-Object System.Data.SqlClient.SqlDataAdapter $cmd
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $dt = New-Object System.Data.DataTable
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $da.Fill($dt) | Out-Null
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cn.Close()
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api>
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> # Print rows with full column widths
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $dt.Rows | ForEach-Object {
>>   $row = $_
>>   "DbNow_UTC:      $($row.DbNow_UTC)"
>>   "LockId:         $($row.LockId)"
>>   "EntityType:     $($row.EntityType)"
>>   "EntityId:       $($row.EntityId)"
>>   "LockedByUserId: $($row.LockedByUserId)"
>>   "LockedAt_UTC:   $($row.LockedAt_UTC)"
>>   "ExpiresAt_UTC:  $($row.ExpiresAt_UTC)"
>>   "Status:         $($row.Status)"
>>   "StatusLength:   $($row.StatusLength)"
>>   "------------------------------------------------------------"
>> }
DbNow_UTC:      11/20/2025 10:32:35
LockId:         184ecadd-f5e4-4585-94a2-84efb78772e4
EntityType:     Visit
EntityId:       11111111-2222-3333-4444-555555555555
LockedByUserId: 6cc795ac-c3c1-4a49-b110-a2da5e2a2fc2
LockedAt_UTC:   2025-11-20 09:58:13.2744519 +00:00
ExpiresAt_UTC:  2025-11-20 10:04:20.2933285 +00:00
Status:         Expired
StatusLength:   14
------------------------------------------------------------
DbNow_UTC:      11/20/2025 10:32:35
LockId:         a99a37f9-6f63-49fd-8b54-6af51855e5e7
EntityType:     Visit
EntityId:       11111111-2222-3333-4444-555555555555
LockedByUserId: 6cc795ac-c3c1-4a49-b110-a2da5e2a2fc2
LockedAt_UTC:   2025-11-20 09:43:03.1333501 +00:00
ExpiresAt_UTC:  2025-11-20 09:49:17.3451933 +00:00
Status:         Expired
StatusLength:   14
------------------------------------------------------------
DbNow_UTC:      11/20/2025 10:32:35
LockId:         af6fd7db-b8dc-4b1d-80cc-4882b95458ca
EntityType:     Visit
EntityId:       11111111-2222-3333-4444-555555555555
LockedByUserId: 6cc795ac-c3c1-4a49-b110-a2da5e2a2fc2
LockedAt_UTC:   2025-11-20 09:37:26.6777266 +00:00
ExpiresAt_UTC:  2025-11-20 09:42:26.6777860 +00:00
Status:         Expired
StatusLength:   14
------------------------------------------------------------
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api>
You said:
got this while doing step 2
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> curl -s -X POST "http://127.0.0.1:59999/api/v1/edit-locks/acquire" -H "Content-Type: application/json" -d '{"entityType":"Visit","entityId":"11111111-2222-3333-4444-555555555555"}' | ConvertFrom-Json | ConvertTo-Json
Invoke-WebRequest : Cannot bind parameter 'Headers'. Cannot convert the "Content-Type:
application/json" value of type "System.String" to type "System.Collections.IDictionary".
At line:1 char:71
+ ... pi/v1/edit-locks/acquire" -H "Content-Type: application/json" -d '{"e ...
+                                  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidArgument: (:) [Invoke-WebRequest], ParameterBindingExce
   ption
    + FullyQualifiedErrorId : CannotConvertArgumentNoMessage,Microsoft.PowerShell.Commands.I
   nvokeWebRequestCommand

PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> curl -s -X POST "http://127.0.0.1:59999/api/v1/edit-locks/acquire" -H "Content-Type: application/json" -d '{"entityType":"Visit","entityId":"11111111-2222-3333-4444-555555555555"}' | ConvertFrom-Json | ConvertTo-Json
Invoke-WebRequest : Cannot bind parameter 'Headers'. Cannot convert the "Content-Type:
application/json" value of type "System.String" to type "System.Collections.IDictionary".
At line:1 char:71
+ ... pi/v1/edit-locks/acquire" -H "Content-Type: application/json" -d '{"e ...
+                                  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidArgument: (:) [Invoke-WebRequest], ParameterBindingExce
   ption
    + FullyQualifiedErrorId : CannotConvertArgumentNoMessage,Microsoft.PowerShell.Commands.I
   nvokeWebRequestCommand

PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api>
You said:
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $body = '{"entityType":"Visit","entityId":"11111111-2222-3333-4444-555555555555"}'
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $hdr  = @{ 'Content-Type' = 'application/json' }
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api>
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $r1 = Invoke-RestMethod -Uri 'http://127.0.0.1:59999/api/v1/edit-locks/acquire' -Method Post -Headers $hdr -Body $body -ErrorAction SilentlyContinue -ResponseHeadersVariable RH1
Invoke-RestMethod : A parameter cannot be found that matches parameter name
'ResponseHeadersVariable'.
At line:1 char:150
+ ... Body $body -ErrorAction SilentlyContinue -ResponseHeadersVariable RH1
+                                              ~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidArgument: (:) [Invoke-RestMethod], ParameterBindingExce
   ption
    + FullyQualifiedErrorId : NamedParameterNotFound,Microsoft.PowerShell.Commands.InvokeRes
   tMethodCommand

PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $r2 = Invoke-RestMethod -Uri 'http://127.0.0.1:59999/api/v1/edit-locks/acquire' -Method Post -Headers $hdr -Body $body -ErrorAction SilentlyContinue -ResponseHeadersVariable RH2
Invoke-RestMethod : A parameter cannot be found that matches parameter name
'ResponseHeadersVariable'.
At line:1 char:150
+ ... Body $body -ErrorAction SilentlyContinue -ResponseHeadersVariable RH2
+                                              ~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidArgument: (:) [Invoke-RestMethod], ParameterBindingExce
   ption
    + FullyQualifiedErrorId : NamedParameterNotFound,Microsoft.PowerShell.Commands.InvokeRes
   tMethodCommand

PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api>
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> "--- First response ---"
--- First response ---
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $r1 | ConvertTo-Json -Depth 5
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> "--- Second response ---"
--- Second response ---
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $r2 | ConvertTo-Json -Depth 5
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api>
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> # also print HTTP status codes (if any) from response headers variables
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> "First status: $($RH1.StatusCode)"
First status:
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> "Second status: $($RH2.StatusCode)"
Second status:
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $server="(localdb)\MSSQLLocalDB"; $db="SynOSDb"; $cs="Server=$server;Database=$db;Trusted_Connection=True;"
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $q = "SELECT LockId, LockedByUserId, CONVERT(varchar(40), LockedAt, 121) AS LockedAt_UTC, CONVERT(varchar(40), ExpiresAt, 121) AS ExpiresAt_UTC, Status FROM dbo.EditLocks WHERE EntityType='Visit' AND EntityId='11111111-2222-3333-4444-555555555555' ORDER BY LockedAt DESC;"
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $cn = New-Object System.Data.SqlClient.SqlConnection $cs; $cmd = $cn.CreateCommand(); $cmd.CommandText = $q; $cn.Open()
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $da = New-Object System.Data.SqlClient.SqlDataAdapter $cmd; $dt = New-Object System.Data.DataTable; $da.Fill($dt) | Out-Null; $cn.Close()
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api> $dt | Format-Table -AutoSize

LockId                               LockedByUserId                       LockedAt_UTC
------                               --------------                       ------------
184ecadd-f5e4-4585-94a2-84efb78772e4 6cc795ac-c3c1-4a49-b110-a2da5e2a2fc2 2025-11-20 09:58...
a99a37f9-6f63-49fd-8b54-6af51855e5e7 6cc795ac-c3c1-4a49-b110-a2da5e2a2fc2 2025-11-20 09:43...
af6fd7db-b8dc-4b1d-80cc-4882b95458ca 6cc795ac-c3c1-4a49-b110-a2da5e2a2fc2 2025-11-20 09:37...


PS D:\Projects\SynOS-Synthesized-Lab-Intelligence\src\SynOS.Api>
