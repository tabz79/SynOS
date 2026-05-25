using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;

namespace SynOS.Api.Middleware
{
    public class ErrorHandlerMiddleware
    {
        private readonly RequestDelegate _next;

        public ErrorHandlerMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task Invoke(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception error)
            {
                var response = context.Response;
                response.ContentType = "application/json";
                var responseModel = new { code = "ERROR", message = error.Message, correlation_id = context.TraceIdentifier };

                switch (error)
                {
                    case BadHttpRequestException e:
                        response.StatusCode = e.StatusCode;
                        responseModel = new { code = "BAD_REQUEST", message = e.Message, correlation_id = context.TraceIdentifier };
                        break;
                    case Models.Exceptions.SnapshotIntegrityException e:
                        response.StatusCode = (int)HttpStatusCode.Conflict;
                        responseModel = new { code = e.Code, message = e.Message, correlation_id = context.TraceIdentifier };
                        break;
                    case UnauthorizedAccessException e:
                        // custom application error
                        response.StatusCode = (int)HttpStatusCode.Unauthorized;
                        break;
                    case KeyNotFoundException e:
                        // not found error
                        response.StatusCode = (int)HttpStatusCode.NotFound;
                        break;
                    default:
                        // unhandled error
                        response.StatusCode = (int)HttpStatusCode.InternalServerError;
                        break;
                }
                var result = JsonSerializer.Serialize(responseModel);

                await response.WriteAsync(result);
            }
        }
    }
}
