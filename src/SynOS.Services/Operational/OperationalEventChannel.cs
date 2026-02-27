using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;

namespace SynOS.Services.Operational
{
    public interface IOperationalEventChannel
    {
        ValueTask PublishEventAsync(Guid eventId, CancellationToken cancellationToken = default);
        IAsyncEnumerable<Guid> ReadAllAsync(CancellationToken cancellationToken = default);
    }

    public class OperationalEventChannel : IOperationalEventChannel
    {
        private readonly Channel<Guid> _channel;

        public OperationalEventChannel()
        {
            var options = new UnboundedChannelOptions
            {
                SingleWriter = false,
                SingleReader = true
            };
            _channel = Channel.CreateUnbounded<Guid>(options);
        }

        public async ValueTask PublishEventAsync(Guid eventId, CancellationToken cancellationToken = default)
        {
            await _channel.Writer.WriteAsync(eventId, cancellationToken);
        }

        public IAsyncEnumerable<Guid> ReadAllAsync(CancellationToken cancellationToken = default)
        {
            return _channel.Reader.ReadAllAsync(cancellationToken);
        }
    }
}
