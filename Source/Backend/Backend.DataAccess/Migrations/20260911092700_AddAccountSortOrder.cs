using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAccountSortOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                table: "Accounts",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // Bestehende Konten behalten ihre heutige Sortierung (Name, dann Id) als
            // Startzustand, damit das Ausrollen der frei wählbaren Reihenfolge für
            // bestehende Nutzer keine sichtbare Umsortierung auslöst.
            migrationBuilder.Sql(
                """
                UPDATE "Accounts" a
                SET "SortOrder" = ranked."Rank" - 1
                FROM (
                    SELECT "Id", ROW_NUMBER() OVER (PARTITION BY "UserId", "Type" ORDER BY "Name", "Id") AS "Rank"
                    FROM "Accounts"
                ) AS ranked
                WHERE a."Id" = ranked."Id";
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_UserId_Type_SortOrder",
                table: "Accounts",
                columns: new[] { "UserId", "Type", "SortOrder" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Accounts_UserId_Type_SortOrder",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "SortOrder",
                table: "Accounts");
        }
    }
}
