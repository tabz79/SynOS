using System;
using Microsoft.Data.SqlClient;

class Program
{
    static void Main()
    {
        string connString = "Server=(localdb)\\MSSQLLocalDB;Database=SynOSDb;Trusted_Connection=True;MultipleActiveResultSets=true";
        string branchId = "a0000000-0000-0000-0000-000000000001";

        using (var conn = new SqlConnection(connString))
        {
            try {
                conn.Open();
                Console.WriteLine("Connection opened.");

                Console.WriteLine($"\n--- Updating Branch {branchId} code to 'MAIN' ---");
                using (var cmd = new SqlCommand($"UPDATE Branches SET Code = 'MAIN' WHERE BranchId = '{branchId}'", conn))
                {
                    int rows = cmd.ExecuteNonQuery();
                    Console.WriteLine($"Updated {rows} row(s).");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("ERROR during update: " + ex.Message);
            }
        }
    }
}
