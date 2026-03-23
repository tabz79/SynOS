using System;
using System.Linq;
using System.Reflection;

namespace SynOS.Debug
{
    class Program
    {
        static void Main(string[] args)
        {
            try
            {
                // Note: We need to load the SynOS.Api assembly.
                // Since this runs from the same root usually, we can try to load the DLL.
                var path = @"src\SynOS.Api\bin\Debug\net8.0\SynOS.Api.dll";
                if (!System.IO.File.Exists(path))
                {
                    Console.WriteLine($"DLL not found at {path}");
                    return;
                }

                var assembly = Assembly.LoadFrom(path);
                var controllerType = assembly.GetType("SynOS.Api.Controllers.DebugController");

                if (controllerType != null)
                {
                    Console.WriteLine("PROOF: DebugController FOUND in SynOS.Api.dll");
                    Console.WriteLine($"Full Name: {controllerType.FullName}");
                    
                    var routeAttr = controllerType.GetCustomAttribute<Microsoft.AspNetCore.Mvc.RouteAttribute>();
                    Console.WriteLine($"Route: {routeAttr?.Template}");

                    var method = controllerType.GetMethod("GetReportStructure");
                    var getAttr = method?.GetCustomAttribute<Microsoft.AspNetCore.Mvc.HttpGetAttribute>();
                    Console.WriteLine($"Action Route: {getAttr?.Template}");
                }
                else
                {
                    Console.WriteLine("FAILURE: DebugController NOT FOUND in assembly.");
                    // List all types in SynOS.Api.Controllers namespace
                    var controllers = assembly.GetTypes()
                        .Where(t => t.Namespace == "SynOS.Api.Controllers" && t.Name.EndsWith("Controller"))
                        .Select(t => t.Name);
                    Console.WriteLine("Found Controllers: " + string.Join(", ", controllers));
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error: {ex.Message}");
            }
        }
    }
}
