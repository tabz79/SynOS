using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SynOS.Data.Migrations
{
    public partial class FinalTruthRemediation : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Safely add missing columns using SQL
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[CostAttribution_UsageFacts]') AND name = 'TotalCost')
                BEGIN
                    ALTER TABLE [CostAttribution_UsageFacts] ADD [TotalCost] decimal(18,4) NULL;
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[CostAttribution_UsageFacts]') AND name = 'UnitCost')
                BEGIN
                    ALTER TABLE [CostAttribution_UsageFacts] ADD [UnitCost] decimal(18,4) NULL;
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[CostAttribution_UsageFacts]') AND name = 'AccuracyFlag')
                BEGIN
                    ALTER TABLE [CostAttribution_UsageFacts] ADD [AccuracyFlag] nvarchar(50) NULL;
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[AR].[ReceivableFacts]') AND name = 'AmountReceived')
                BEGIN
                    ALTER TABLE [AR].[ReceivableFacts] ADD [AmountReceived] decimal(18,2) NOT NULL DEFAULT 0;
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[ReferralPayableFacts]') AND name = 'AmountPaid')
                BEGIN
                    ALTER TABLE [ReferralPayableFacts] ADD [AmountPaid] decimal(18,2) NOT NULL DEFAULT 0;
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[SpendFacts]') AND name = 'Category')
                BEGIN
                    ALTER TABLE [SpendFacts] ADD [Category] nvarchar(max) NOT NULL DEFAULT '';
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[PayStructureComponents]') AND name = 'BaseAmount')
                BEGIN
                    ALTER TABLE [PayStructureComponents] ADD [BaseAmount] decimal(18,2) NOT NULL DEFAULT 0;
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Orders]') AND name = 'IsOutsourced')
                BEGIN
                    ALTER TABLE [Orders] ADD [IsOutsourced] bit NOT NULL DEFAULT 0;
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Orders]') AND name = 'OutsourcedAt')
                BEGIN
                    ALTER TABLE [Orders] ADD [OutsourcedAt] datetime2 NULL;
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Orders]') AND name = 'ReferenceLabName')
                BEGIN
                    ALTER TABLE [Orders] ADD [ReferenceLabName] nvarchar(200) NULL;
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[IMS_StockMovements]') AND name = 'InventoryLotId')
                BEGIN
                    ALTER TABLE [IMS_StockMovements] ADD [InventoryLotId] uniqueidentifier NULL;
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID(N'[IMS_StockMovements]') AND name = 'IX_IMS_StockMovements_InventoryLotId')
                BEGIN
                    CREATE INDEX [IX_IMS_StockMovements_InventoryLotId] ON [IMS_StockMovements] ([InventoryLotId]);
                END
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_IMS_StockMovements_IMS_InventoryLots_InventoryLotId",
                table: "IMS_StockMovements");

            migrationBuilder.DropIndex(
                name: "IX_IMS_StockMovements_InventoryLotId",
                table: "IMS_StockMovements");

            migrationBuilder.DropColumn(name: "AccuracyFlag", table: "CostAttribution_UsageFacts");
            migrationBuilder.DropColumn(name: "TotalCost", table: "CostAttribution_UsageFacts");
            migrationBuilder.DropColumn(name: "UnitCost", table: "CostAttribution_UsageFacts");
            migrationBuilder.DropColumn(name: "AmountReceived", schema: "AR", table: "ReceivableFacts");
            migrationBuilder.DropColumn(name: "AmountPaid", table: "ReferralPayableFacts");
            migrationBuilder.DropColumn(name: "Category", table: "SpendFacts");
            migrationBuilder.DropColumn(name: "BaseAmount", table: "PayStructureComponents");
            migrationBuilder.DropColumn(name: "IsOutsourced", table: "Orders");
            migrationBuilder.DropColumn(name: "OutsourcedAt", table: "Orders");
            migrationBuilder.DropColumn(name: "ReferenceLabName", table: "Orders");
            migrationBuilder.DropColumn(name: "InventoryLotId", table: "IMS_StockMovements");
        }
    }
}
