Here is the corrected code for the migration file. Please follow these steps:

1.  **Open this file:**
    `src/SynOS.Data/migrations/20251121125941_AddSamplesAndRejectionsTables.cs`

2.  **Delete all the code** currently inside that file.

3.  **Copy and paste the entire code block below** into that blank file.

4.  **Save the file** and then run the database update command again.

```csharp
using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.migrations
{
    /// <inheritdoc />
    public partial class AddSamplesAndRejectionsTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF EXISTS (
                    SELECT 1
                    FROM sys.indexes
                    WHERE name = 'IX_EditLocks_EntityType_EntityId_Status'
                      AND object_id = OBJECT_ID('[dbo].[EditLocks]')
                )
                DROP INDEX [IX_EditLocks_EntityType_EntityId_Status] ON [dbo].[EditLocks];
            ");

            migrationBuilder.AddColumn<int>(
                name: "DefaultTubeType",
                table: "TestDefinitions",
                type: "int",
                maxLength: 20,
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "Samples",
                columns: table => new
                {
                    SampleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TubeType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Barcode = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    CollectedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CollectedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    IsRejected = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Samples", x => x.SampleId);
                    table.ForeignKey(
                        name: "FK_Samples_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "OrderId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Samples_Users_CollectedByUserId",
                        column: x => x.CollectedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "SampleRejections",
                columns: table => new
                {
                    RejectionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SampleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    RequiresRecollection = table.Column<bool>(type: "bit", nullable: false),
                    NewSampleId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RejectedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RejectedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SampleRejections", x => x.RejectionId);
                    table.ForeignKey(
                        name: "FK_SampleRejections_Samples_NewSampleId",
                        column: x => x.NewSampleId,
                        principalTable: "Samples",
                        principalColumn: "SampleId");
                    table.ForeignKey(
                        name: "FK_SampleRejections_Samples_SampleId",
                        column: x => x.SampleId,
                        principalTable: "Samples",
                        principalColumn: "SampleId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SampleRejections_Users_RejectedByUserId",
                        column: x => x.RejectedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EditLocks_EntityType_EntityId",
                table: "EditLocks",
                columns: new[] { "EntityType", "EntityId" },
                unique: true,
                filter: "[Status] = 'Active'");

            migrationBuilder.CreateIndex(
                name: "IX_SampleRejections_NewSampleId",
                table: "SampleRejections",
                column: "NewSampleId");

            migrationBuilder.CreateIndex(
                name: "IX_SampleRejections_RejectedByUserId",
                table: "SampleRejections",
                column: "RejectedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SampleRejections_SampleId",
                table: "SampleRejections",
                column: "SampleId");

            migrationBuilder.CreateIndex(
                name: "IX_Samples_Barcode",
                table: "Samples",
                column: "Barcode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Samples_CollectedByUserId",
                table: "Samples",
                column: "CollectedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Samples_OrderId",
                table: "Samples",
                column: "OrderId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SampleRejections");

            migrationBuilder.DropTable(
                name: "Samples");

            migrationBuilder.DropIndex(
                name: "IX_EditLocks_EntityType_EntityId",
                table: "EditLocks");

            migrationBuilder.DropColumn(
                name: "DefaultTubeType",
                table: "TestDefinitions");

            migrationBuilder.CreateIndex(
                name: "IX_EditLocks_EntityType_EntityId_Status",
                table: "EditLocks",
                columns: new[] { "EntityType", "EntityId", "Status" },
                unique: true,
                filter: "[Status] = 0");
        }
    }
}
```
