using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddFixedCosts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "FixedCostId",
                table: "Transactions",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "FixedCosts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AccountId = table.Column<int>(type: "integer", nullable: false),
                    CategoryId = table.Column<int>(type: "integer", nullable: true),
                    Month = table.Column<DateOnly>(type: "date", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: false),
                    Note = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FixedCosts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FixedCosts_Accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "Accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_FixedCosts_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_FixedCostId",
                table: "Transactions",
                column: "FixedCostId");

            migrationBuilder.CreateIndex(
                name: "IX_FixedCosts_Account_Month",
                table: "FixedCosts",
                columns: new[] { "AccountId", "Month" });

            migrationBuilder.CreateIndex(
                name: "IX_FixedCosts_Account_Month_Name",
                table: "FixedCosts",
                columns: new[] { "AccountId", "Month", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FixedCosts_CategoryId",
                table: "FixedCosts",
                column: "CategoryId");

            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_FixedCosts_FixedCostId",
                table: "Transactions",
                column: "FixedCostId",
                principalTable: "FixedCosts",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_FixedCosts_FixedCostId",
                table: "Transactions");

            migrationBuilder.DropTable(
                name: "FixedCosts");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_FixedCostId",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "FixedCostId",
                table: "Transactions");
        }
    }
}
