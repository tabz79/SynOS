using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Channels;

namespace SynOS.RemoteBridge.Services
{
    public class BridgeLogEntry
    {
        public string Id { get; set; } = Guid.NewGuid().ToString("N")[..8];
        public DateTime Timestamp { get; set; } = DateTime.Now;
        public string Category { get; set; } = "SYSTEM"; // DICOM-SCP, C-ECHO, CLOUD-SYNC, SPOOL, SYSTEM
        public string Level { get; set; } = "INFO";      // INFO, SUCCESS, WARN, ERROR
        public string Message { get; set; } = string.Empty;
    }

    public class BridgeTelemetry
    {
        public long SlicesReceived { get; set; } = 0;
        public long StudiesReceived { get; set; } = 0;
        public long CloudUploaded { get; set; } = 0;
        public long CloudErrors { get; set; } = 0;
        public long SpoolPending { get; set; } = 0;
        public List<int> BoundPorts { get; set; } = new();
        public bool DicomListenerActive { get; set; } = false;
        public bool CloudOnline { get; set; } = false;
        public string LastCloudError { get; set; } = string.Empty;
        public DateTime? LastDicomActivity { get; set; }
        public DateTime? LastCloudUploadTime { get; set; }
    }

    public class BridgeLogService
    {
        private readonly ConcurrentQueue<BridgeLogEntry> _recentLogs = new();
        private readonly List<Channel<BridgeLogEntry>> _subscribers = new();
        private readonly object _lock = new();
        private const int MaxLogRetention = 500;

        public BridgeTelemetry Telemetry { get; } = new();

        public void Log(string category, string message, string level = "INFO")
        {
            var entry = new BridgeLogEntry
            {
                Timestamp = DateTime.Now,
                Category = category,
                Level = level,
                Message = message
            };

            _recentLogs.Enqueue(entry);
            while (_recentLogs.Count > MaxLogRetention && _recentLogs.TryDequeue(out _)) { }

            Console.WriteLine($"[{entry.Timestamp:HH:mm:ss.fff}] [{category}] [{level}] {message}");

            lock (_lock)
            {
                for (int i = _subscribers.Count - 1; i >= 0; i--)
                {
                    try
                    {
                        if (!_subscribers[i].Writer.TryWrite(entry))
                        {
                            // If channel is full or broken, drop subscriber
                        }
                    }
                    catch
                    {
                        _subscribers.RemoveAt(i);
                    }
                }
            }
        }

        public List<BridgeLogEntry> GetRecentLogs(int count = 100)
        {
            return _recentLogs.TakeLast(count).ToList();
        }

        public ChannelReader<BridgeLogEntry> Subscribe()
        {
            var channel = Channel.CreateUnbounded<BridgeLogEntry>();
            lock (_lock)
            {
                _subscribers.Add(channel);
            }
            return channel.Reader;
        }

        public void Unsubscribe(ChannelReader<BridgeLogEntry> reader)
        {
            lock (_lock)
            {
                _subscribers.RemoveAll(c => c.Reader == reader);
            }
        }
    }
}
