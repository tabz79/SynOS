using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Data.Common;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace SynOS.Services.Diagnostics
{
    public class QueryProfileRecord
    {
        public string CommandText { get; set; } = string.Empty;
        public double DurationMs { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    public class ProfilingScope : IDisposable
    {
        private readonly ProfilingInterceptor _interceptor;
        private readonly List<QueryProfileRecord> _scopeRecords = new();
        private static readonly AsyncLocal<ProfilingScope?> _currentScope = new();

        public static ProfilingScope? Current => _currentScope.Value;

        public ProfilingScope(ProfilingInterceptor interceptor)
        {
            _interceptor = interceptor;
            _currentScope.Value = this;
        }

        public void RecordQuery(string commandText, double durationMs)
        {
            lock (_scopeRecords)
            {
                _scopeRecords.Add(new QueryProfileRecord
                {
                    CommandText = commandText,
                    DurationMs = durationMs
                });
            }
        }

        public (int TotalCount, double TotalTimeMs, double AvgTimeMs, List<QueryProfileRecord> Top10Slowest, int ReferenceRangeCount) GetMetrics()
        {
            lock (_scopeRecords)
            {
                int count = _scopeRecords.Count;
                double totalTime = _scopeRecords.Sum(r => r.DurationMs);
                double avgTime = count > 0 ? totalTime / count : 0;
                var top10 = _scopeRecords.OrderByDescending(r => r.DurationMs).Take(10).ToList();
                int refRangeCount = _scopeRecords.Count(r => r.CommandText.Contains("ReferenceRanges", StringComparison.OrdinalIgnoreCase));
                return (count, totalTime, avgTime, top10, refRangeCount);
            }
        }

        public void Dispose()
        {
            if (_currentScope.Value == this)
            {
                _currentScope.Value = null;
            }
        }
    }

    public class ProfilingInterceptor : DbCommandInterceptor
    {
        public ProfilingScope BeginScope()
        {
            return new ProfilingScope(this);
        }

        public override DbDataReader ReaderExecuted(DbCommand command, CommandExecutedEventData eventData, DbDataReader result)
        {
            ProfilingScope.Current?.RecordQuery(command.CommandText, eventData.Duration.TotalMilliseconds);
            return base.ReaderExecuted(command, eventData, result);
        }

        public override ValueTask<DbDataReader> ReaderExecutedAsync(DbCommand command, CommandExecutedEventData eventData, DbDataReader result, CancellationToken cancellationToken = default)
        {
            ProfilingScope.Current?.RecordQuery(command.CommandText, eventData.Duration.TotalMilliseconds);
            return base.ReaderExecutedAsync(command, eventData, result, cancellationToken);
        }

        public override object? ScalarExecuted(DbCommand command, CommandExecutedEventData eventData, object? result)
        {
            ProfilingScope.Current?.RecordQuery(command.CommandText, eventData.Duration.TotalMilliseconds);
            return base.ScalarExecuted(command, eventData, result);
        }

        public override ValueTask<object?> ScalarExecutedAsync(DbCommand command, CommandExecutedEventData eventData, object? result, CancellationToken cancellationToken = default)
        {
            ProfilingScope.Current?.RecordQuery(command.CommandText, eventData.Duration.TotalMilliseconds);
            return base.ScalarExecutedAsync(command, eventData, result, cancellationToken);
        }

        public override int NonQueryExecuted(DbCommand command, CommandExecutedEventData eventData, int result)
        {
            ProfilingScope.Current?.RecordQuery(command.CommandText, eventData.Duration.TotalMilliseconds);
            return base.NonQueryExecuted(command, eventData, result);
        }

        public override ValueTask<int> NonQueryExecutedAsync(DbCommand command, CommandExecutedEventData eventData, int result, CancellationToken cancellationToken = default)
        {
            ProfilingScope.Current?.RecordQuery(command.CommandText, eventData.Duration.TotalMilliseconds);
            return base.NonQueryExecutedAsync(command, eventData, result, cancellationToken);
        }
    }
}
