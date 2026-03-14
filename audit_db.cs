using System;
using Microsoft.Data.SqlClient;

class Program
{
    static void Main()
    {
        string connString = "Server=(localdb)\\MSSQLLocalDB;Database=SynOSDb;Trusted_Connection=True;MultipleActiveResultSets=true";
        string assignmentId = "f18316b4-0ab1-4e89-8876-fb0dc86856fe";
        string visitId = "fdb333c7-94e0-4a68-82f6-cf0187a994b4";

        using (var conn = new SqlConnection(connString))
        {
            conn.Open();
            Console.WriteLine("Connection opened.");

            Console.WriteLine($"\n--- Auditing Assignment {assignmentId} ---");
            using (var cmd = new SqlCommand($"SELECT AssignmentId, SourceReferenceId, Status, BranchId FROM WorkAssignments WHERE AssignmentId = '{assignmentId}'", conn))
            using (var reader = cmd.ExecuteReader())
            {
                if (reader.Read())
                {
                    Console.WriteLine($"Found Assignment: ID={reader[0]}, SourceRef={reader[1]}, Status={reader[2]}, Branch={reader[3]}");
                }
                else
                {
                    Console.WriteLine("Assignment NOT FOUND in WorkAssignments table.");
                }
            }

            Console.WriteLine($"\n--- Auditing Visit {visitId} ---");
            using (var cmd = new SqlCommand($"SELECT VisitId, BranchId, Token FROM Visits WHERE VisitId = '{visitId}'", conn))
            using (var reader = cmd.ExecuteReader())
            {
                if (reader.Read())
                {
                    Console.WriteLine($"Found Visit: ID={reader[0]}, Branch={reader[1]}, Token={reader[2]}");
                }
                else
                {
                    Console.WriteLine("Visit NOT FOUND in Visits table.");
                }
            }

            Console.WriteLine("\n--- Auditing Accessions for Assignment ---");
            using (var cmd = new SqlCommand($"SELECT COUNT(*) FROM WorkAssignmentAccessions WHERE WorkAssignmentId = '{assignmentId}'", conn))
            {
                int count = (int)cmd.ExecuteScalar();
                Console.WriteLine($"Found {count} reserved accessions.");
            }
        }
    }
}
