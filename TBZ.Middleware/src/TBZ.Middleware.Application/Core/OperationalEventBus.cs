using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading.Tasks;
using TBZ.Middleware.Application.Interfaces;

namespace TBZ.Middleware.Application.Core
{
    public class OperationalEventBus : IOperationalEventBus
    {
        private readonly ConcurrentDictionary<Type, List<Delegate>> _handlers = new ConcurrentDictionary<Type, List<Delegate>>();

        public void Subscribe<TEvent>(Func<TEvent, Task> handler) where TEvent : class
        {
            if (handler == null) throw new ArgumentNullException(nameof(handler));

            _handlers.AddOrUpdate(
                typeof(TEvent),
                _ => new List<Delegate> { handler },
                (_, list) =>
                {
                    lock (list)
                    {
                        list.Add(handler);
                    }
                    return list;
                }
            );
        }

        public async Task PublishAsync<TEvent>(TEvent @event) where TEvent : class
        {
            if (@event == null) return;

            if (_handlers.TryGetValue(typeof(TEvent), out var list))
            {
                List<Delegate> handlersCopy;
                lock (list)
                {
                    handlersCopy = new List<Delegate>(list);
                }

                foreach (var handlerDelegate in handlersCopy)
                {
                    if (handlerDelegate is Func<TEvent, Task> handler)
                    {
                        try
                        {
                            await handler(@event);
                        }
                        catch (Exception ex)
                        {
                            // Log or handle individual subscriber failure to keep the event loop alive
                            Console.WriteLine($"[EventBus Error] Exception thrown in event handler: {ex.Message}");
                        }
                    }
                }
            }
        }
    }
}
