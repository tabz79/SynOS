using System;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SynOS.Data;
using SynOS.Models.Enums;
using SynOS.Models.Entities.Operations;

namespace ConcurrencyTest
{
    class Program
    {
        static async Task Main(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<SynOSDbContext>();
            optionsBuilder.UseSqlServer("Server=(localdb)\\mssqllocaldb;Database=SynOS;Trusted_Connection=True;MultipleActiveResultSets=true");

            using (var context = new SynOSDbContext(optionsBuilder.Options))
            {
                Console.WriteLine("--- CONCURRENCY TEST SETUP ---");

                // 1. Get/Create Branch
                var branchId = Guid.Parse("6cc795ac-c3c1-4a49-b110-a2da5e2a2fc2"); // Standard dev branch

                // 2. Create Test Assignment
                var assignmentId = Guid.NewGuid();
                var assignment = new WorkAssignment
                {
                    AssignmentId = assignmentId,
                    WorkType = WorkType.SampleCollection,
                    SourceReferenceId = Guid.NewGuid(),
                    Department = "Pathology",
                    BranchId = branchId,
                    Status = WorkAssignmentStatus.PendingClaim,
                    CreatedAt = DateTimeOffset.UtcNow
                };
                context.WorkAssignments.Add(assignment);

                // 3. Create two Operational Resources (same branch)
                var userA = Guid.NewGuid();
                var userB = Guid.NewGuid();

                context.OperationalResources.Add(new OperationalResource 
                { 
                    OperationalResourceId = Guid.NewGuid(), 
                    UserId = userA, 
                    BranchId = branchId, 
                    Role = "Phlebotomist", 
                    DepartmentCode = "Pathology" 
                });

                context.OperationalResources.Add(new OperationalResource 
                { 
                    OperationalResourceId = Guid.NewGuid(), 
                    UserId = userB, 
                    BranchId = branchId, 
                    Role = "Phlebotomist", 
                    DepartmentCode = "Pathology" 
                });

                await context.SaveChangesAsync();
                Console.WriteLine($"Test assignment {assignmentId} created.");

                Console.WriteLine("\nFiring concurrent claims...");

                var taskA = Task.Run(async () => {
                    using (var db = new SynOSDbContext(optionsBuilder.Options)) {
                        return await db.WorkAssignments
                            .Where(a => a.AssignmentId == assignmentId && a.Status == WorkAssignmentStatus.PendingClaim && a.AssignedResourceId == null)
                            .ExecuteUpdateAsync(s => s
                                .SetProperty(x => x.Status, WorkAssignmentStatus.Assigned)
                                .SetProperty(x => x.AssignedResourceId, userA)
                                .SetProperty(x => x.ClaimedAt, DateTime.UtcNow));
                    }
                });

                var taskB = Task.Run(async () => {
                    using (var db = new SynOSDbContext(optionsBuilder.Options)) {
                        return await db.WorkAssignments
                            .Where(a => a.AssignmentId == assignmentId && a.Status == WorkAssignmentStatus.PendingClaim && a.AssignedResourceId == null)
                            .ExecuteUpdateAsync(s => s
                                .SetProperty(x => x.Status, WorkAssignmentStatus.Assigned)
                                .SetProperty(x => x.AssignedResourceId, userB)
                                .SetProperty(x => x.ClaimedAt, DateTime.UtcNow));
                    }
                });

                var results = await Task.WhenAll(taskA, taskB);
                Console.WriteLine($"Results: User A Affected={results[0]}, User B Affected={results[1]}");

                var finalState = await context.WorkAssignments.AsNoTracking().FirstOrDefaultAsync(x => x.AssignmentId == assignmentId);
                Console.WriteLine($"Final DB State: Status={finalState.Status}, AssignedTo={finalState.AssignedResourceId}");

                if (results.Sum() == 1)
                    Console.WriteLine("SUCCESS: Exactly one user claimed the assignment.");
                else
                    Console.WriteLine("FAILURE: Concurrency check failed!");
                
                Console.WriteLine("\n--- TEST COMPLETE ---");
            }
        }
    }
}
