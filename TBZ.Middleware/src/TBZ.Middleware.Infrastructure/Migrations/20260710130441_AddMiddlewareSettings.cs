using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TBZ.Middleware.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMiddlewareSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MiddlewareSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    AllowedOrigins = table.Column<string>(type: "TEXT", nullable: false),
                    RateLimitPermitLimit = table.Column<int>(type: "INTEGER", nullable: false),
                    RateLimitWindowSeconds = table.Column<int>(type: "INTEGER", nullable: false),
                    RateLimitQueueLimit = table.Column<int>(type: "INTEGER", nullable: false),
                    DiagnosticsEncryptionKey = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MiddlewareSettings", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MiddlewareSettings");
        }
    }
}
