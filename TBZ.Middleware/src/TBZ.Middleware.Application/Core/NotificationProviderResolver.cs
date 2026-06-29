using System;
using System.Collections.Generic;
using System.Linq;
using TBZ.Middleware.Application.Interfaces;

namespace TBZ.Middleware.Application.Core
{
    public class NotificationProviderResolver : INotificationProviderResolver
    {
        private readonly IEnumerable<INotificationProvider> _providers;

        public NotificationProviderResolver(IEnumerable<INotificationProvider> providers)
        {
            _providers = providers;
        }

        public INotificationProvider Resolve(string channel)
        {
            var provider = _providers.FirstOrDefault(p => p.Channel.Equals(channel, StringComparison.OrdinalIgnoreCase));
            if (provider == null)
            {
                throw new NotSupportedException($"Notification channel '{channel}' is not supported.");
            }
            return provider;
        }
    }
}
