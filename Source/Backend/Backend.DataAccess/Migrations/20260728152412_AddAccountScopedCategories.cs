using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAccountScopedCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Categories_Users_UserId",
                table: "Categories");

            // Die Spalte wechselt ihre Bedeutung von Nutzer- auf Kontozugehörigkeit.
            // Bestehende Werte wären danach Verweise auf fremde Konten, deshalb werden
            // die Kategorien samt ihrer Budgets verworfen. Buchungen bleiben erhalten
            // und verlieren nur ihre Kategorie.
            migrationBuilder.Sql("UPDATE \"Transactions\" SET \"CategoryId\" = NULL WHERE \"CategoryId\" IS NOT NULL;");
            migrationBuilder.Sql("DELETE FROM \"Budgets\";");
            migrationBuilder.Sql("DELETE FROM \"Categories\";");

            migrationBuilder.RenameColumn(
                name: "UserId",
                table: "Categories",
                newName: "AccountId");

            migrationBuilder.RenameIndex(
                name: "IX_Categories_UserId_Name",
                table: "Categories",
                newName: "IX_Categories_AccountId_Name");

            migrationBuilder.AddForeignKey(
                name: "FK_Categories_Accounts_AccountId",
                table: "Categories",
                column: "AccountId",
                principalTable: "Accounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Categories_Accounts_AccountId",
                table: "Categories");

            migrationBuilder.RenameColumn(
                name: "AccountId",
                table: "Categories",
                newName: "UserId");

            migrationBuilder.RenameIndex(
                name: "IX_Categories_AccountId_Name",
                table: "Categories",
                newName: "IX_Categories_UserId_Name");

            migrationBuilder.AddForeignKey(
                name: "FK_Categories_Users_UserId",
                table: "Categories",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
