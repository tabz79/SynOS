backend logs:
PS D:\Projects\SynOS-Synthesized-Lab-Intelligence> dotnet run --project src\SynOS.Api\SynOS.Api.csproj --urls "http://127.0.0.1:59999"
[11:45:24 WRN] Sensitive data logging is enabled. Log entries and exception messages may include sensitive application data; this mode should only be enabled during development.
[CatalogSeedService] Seeded base modalities and migrated legacy departments/tests/studies/templates successfully.
[11:46:03 INF] Notification Worker Service running.
[11:46:03 INF] OperationalStatsProjectionWorker is starting in Event-Driven Mode.
[11:46:03 INF] Worker: Running Consistency Check and Catch-up...
[11:46:03 INF] [ProjectorDebug] Processing Event Type: REPORT_SIGNED, BranchId: a0000000-0000-0000-0000-000000000001, SourceId: 2ca711ba-a0c5-46d9-bb54-10adc58a1ac7, SourceType: Report, VisitId: 014f385b-fce8-4d5e-b40f-0a537846336b
[11:46:04 INF] [ProjectorDebug] Checking Fact Deduplication for SourceId: 2ca711ba-a0c5-46d9-bb54-10adc58a1ac7
[11:46:04 WRN] Projector: Duplicate Event for Fact 2ca711ba-a0c5-46d9-bb54-10adc58a1ac7 detected. Skipping Logic, marking as Processed. EventId: 9ef63611-f7f6-4af7-b3cd-88475f85674e
[11:46:04 WRN] Savepoints are disabled because Multiple Active Result Sets (MARS) is enabled. If 'SaveChanges' fails, then the transaction cannot be automatically rolled back to a known clean state. Instead, the transaction should be rolled back by the application before retrying 'SaveChanges'. See https://go.microsoft.com/fwlink/?linkid=2149338 for more information and examples. To identify the code which triggers this warning, call 'ConfigureWarnings(w => w.Throw(SqlServerEventId.SavepointsDisabledBecauseOfMARS))'.
[11:46:04 INF] Worker: Catch-up complete. Awaiting real-time events...
[11:46:26 WRN] Failed to determine the https port for redirect.
[11:46:27 INF] Terminal web-0lses8gca attempted to register Thermal80mm for Branch a0000000-0000-0000-0000-000000000001 but lacked Lead authorization.
[11:46:32 WRN] The query uses the 'First'/'FirstOrDefault' operator without 'OrderBy' and filter operators. This may lead to unpredictable results.
[11:46:34 INF] RESULT MAP KEYS → [ALP, T_P, ALB, GLOB, BIL_T, SGOT, SGPT, ALB : GLOB, BIL_D]
[11:46:35 INF] RESULT MAP KEYS → [ALP, T_P, ALB, GLOB, BIL_T, SGOT, SGPT, ALB : GLOB, BIL_D]
[11:46:35 WRN] The query uses the 'First'/'FirstOrDefault' operator without 'OrderBy' and filter operators. This may lead to unpredictable results.
[11:46:46 INF] Terminal web-1zy6xxtky authorized and added to Thermal80mm group for Branch a0000000-0000-0000-0000-000000000001.
[11:47:53 INF] RESULT MAP KEYS → [ALP, T_P, ALB, GLOB, BIL_T, SGOT, SGPT, ALB : GLOB, BIL_D]
[11:47:53 INF] RESULT MAP KEYS → [ALP, T_P, ALB, GLOB, BIL_T, SGOT, SGPT, ALB : GLOB, BIL_D]
[12:00:31 INF] RESULT MAP KEYS → [ALP, T_P, ALB, GLOB, BIL_T, SGOT, SGPT, ALB : GLOB, BIL_D]
[12:00:31 INF] RESULT MAP KEYS → [ALP, T_P, ALB, GLOB, BIL_T, SGOT, SGPT, ALB : GLOB, BIL_D]
[12:03:10 ERR] An exception occurred while iterating over the results of a query for context type 'SynOS.Data.SynOSDbContext'.
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
[12:03:10 ERR] An exception occurred while iterating over the results of a query for context type 'SynOS.Data.SynOSDbContext'.
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
[12:03:13 ERR] An exception occurred while iterating over the results of a query for context type 'SynOS.Data.SynOSDbContext'.
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
[12:03:13 ERR] An exception occurred while iterating over the results of a query for context type 'SynOS.Data.SynOSDbContext'.
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
[12:03:35 ERR] An exception occurred while iterating over the results of a query for context type 'SynOS.Data.SynOSDbContext'.
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
[12:03:35 ERR] An exception occurred while iterating over the results of a query for context type 'SynOS.Data.SynOSDbContext'.
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
[12:04:54 ERR] An exception occurred while iterating over the results of a query for context type 'SynOS.Data.SynOSDbContext'.
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
[12:04:54 ERR] An exception occurred while iterating over the results of a query for context type 'SynOS.Data.SynOSDbContext'.
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
[12:05:19 ERR] An exception occurred while iterating over the results of a query for context type 'SynOS.Data.SynOSDbContext'.
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
[12:05:19 ERR] An exception occurred while iterating over the results of a query for context type 'SynOS.Data.SynOSDbContext'.
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
[12:05:19 INF] Terminal web-1zy6xxtky authorized and added to Thermal80mm group for Branch a0000000-0000-0000-0000-000000000001.
[12:05:25 ERR] An exception occurred while iterating over the results of a query for context type 'SynOS.Data.SynOSDbContext'.
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
[12:05:25 ERR] An exception occurred while iterating over the results of a query for context type 'SynOS.Data.SynOSDbContext'.
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
[12:14:46 ERR] An exception occurred while iterating over the results of a query for context type 'SynOS.Data.SynOSDbContext'.
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
[12:14:46 ERR] An exception occurred while iterating over the results of a query for context type 'SynOS.Data.SynOSDbContext'.
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
[12:14:48 ERR] An exception occurred while iterating over the results of a query for context type 'SynOS.Data.SynOSDbContext'.
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
[12:14:48 ERR] An exception occurred while iterating over the results of a query for context type 'SynOS.Data.SynOSDbContext'.
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
[12:15:05 ERR] An exception occurred while iterating over the results of a query for context type 'SynOS.Data.SynOSDbContext'.
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
[12:15:05 ERR] An exception occurred while iterating over the results of a query for context type 'SynOS.Data.SynOSDbContext'.
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
System.InvalidOperationException: An error occurred while reading a database value. The expected type was 'System.Nullable`1[System.Guid]' but the actual value was of type 'System.String'.
 ---> System.InvalidCastException: Unable to cast object of type 'System.String' to type 'System.Guid'.
   at Microsoft.Data.SqlClient.SqlBuffer.get_Guid()
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   --- End of inner exception stack trace ---
   at lambda_method4317(Closure, QueryContext, DbDataReader, ResultContext, SingleQueryResultCoordinator)
   at Microsoft.EntityFrameworkCore.Query.Internal.SingleQueryingEnumerable`1.AsyncEnumerator.MoveNextAsync()
