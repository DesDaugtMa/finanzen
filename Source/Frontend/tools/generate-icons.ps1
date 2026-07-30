# Erzeugt die PWA-Icons als PNG in public/icons.
#
# Die PNGs sind eingecheckt; dieses Skript muss nur laufen, wenn sich die Marke
# aendert. Gezeichnet wird mit GDI+ statt aus dem SVG rasterisiert, weil in der
# Toolchain des Projekts kein SVG-Rasterizer vorhanden ist. Die Geometrie ist
# identisch zu public/icons/icon.svg — Aenderungen also immer in beiden Dateien.
#
# Aufruf:  pwsh tools/generate-icons.ps1   (aus Source/Frontend)

Add-Type -AssemblyName System.Drawing

$OutDir = Join-Path (Split-Path $PSScriptRoot -Parent) 'public\icons'

function New-Icon {
    param(
        [int]$Size,
        [string]$Path,
        # Anteil der Kantenlaenge, den die Marke einnimmt. Maskable-Icons brauchen
        # Luft, weil das Betriebssystem bis zu 20% je Seite wegschneidet.
        [double]$MarkScale = 1.0,
        # Eckenradius relativ zur Kantenlaenge. 0 = randlos (maskable / iOS).
        [double]$CornerRatio = 0.226
    )

    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bitmap)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # --- Hintergrundflaeche mit Marine-Verlauf --------------------------------
    $rect = New-Object System.Drawing.RectangleF(0, 0, $Size, $Size)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.PointF(0, 0)),
        (New-Object System.Drawing.PointF($Size, $Size)),
        [System.Drawing.Color]::FromArgb(255, 22, 35, 63),
        [System.Drawing.Color]::FromArgb(255, 28, 59, 82))
    $blend = New-Object System.Drawing.Drawing2D.ColorBlend(3)
    $blend.Colors = @(
        [System.Drawing.Color]::FromArgb(255, 22, 35, 63),
        [System.Drawing.Color]::FromArgb(255, 30, 48, 80),
        [System.Drawing.Color]::FromArgb(255, 28, 59, 82))
    $blend.Positions = @(0.0, 0.58, 1.0)
    $brush.InterpolationColors = $blend

    if ($CornerRatio -gt 0) {
        $r = $Size * $CornerRatio
        $d = $r * 2
        # Nicht "$path" nennen: PowerShell-Variablen sind case-insensitive und
        # wuerden den Parameter $Path ueberschreiben.
        $outline = New-Object System.Drawing.Drawing2D.GraphicsPath
        $outline.AddArc(0, 0, $d, $d, 180, 90)
        $outline.AddArc($Size - $d, 0, $d, $d, 270, 90)
        $outline.AddArc($Size - $d, $Size - $d, $d, $d, 0, 90)
        $outline.AddArc(0, $Size - $d, $d, $d, 90, 90)
        $outline.CloseFigure()
        $g.FillPath($brush, $outline)
        $g.SetClip($outline)
        $outline.Dispose()
    } else {
        $g.FillRectangle($brush, $rect)
    }
    $brush.Dispose()

    # --- Teal-Schein oben rechts ---------------------------------------------
    $sheenPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $sheenSize = $Size * 2.2
    $sheenPath.AddEllipse(($Size * 0.88 - $sheenSize / 2), (-$Size * 0.1 - $sheenSize / 2), $sheenSize, $sheenSize)
    $sheen = New-Object System.Drawing.Drawing2D.PathGradientBrush($sheenPath)
    $sheen.CenterColor = [System.Drawing.Color]::FromArgb(87, 47, 167, 159)
    $sheen.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 47, 167, 159))
    $g.FillPath($sheen, $sheenPath)
    $sheen.Dispose()
    $sheenPath.Dispose()

    # --- Marke: Geldboerse ---------------------------------------------------
    # In SVG-Koordinaten (512er Raster) definiert und dann skaliert, damit die
    # Geometrie mit icon.svg uebereinstimmt.
    $unit = $Size / 512.0
    $center = $Size / 2.0

    $g.TranslateTransform($center, $center)
    $g.ScaleTransform($MarkScale, $MarkScale)
    $g.TranslateTransform(-$center, -$center)

    function Add-RoundedRect {
        param($Gp, [double]$X, [double]$Y, [double]$W, [double]$H, [double]$R)
        $d = $R * 2
        $Gp.AddArc($X, $Y, $d, $d, 180, 90)
        $Gp.AddArc($X + $W - $d, $Y, $d, $d, 270, 90)
        $Gp.AddArc($X + $W - $d, $Y + $H - $d, $d, $d, 0, 90)
        $Gp.AddArc($X, $Y + $H - $d, $d, $d, 90, 90)
        $Gp.CloseFigure()
    }

    # Korpus
    $body = New-Object System.Drawing.Drawing2D.GraphicsPath
    Add-RoundedRect $body (112 * $unit) (164 * $unit) (288 * $unit) (196 * $unit) (40 * $unit)
    $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(240, 255, 255, 255))
    $g.FillPath($white, $body)
    $white.Dispose()
    $body.Dispose()

    # Klappe: oberer Streifen des Korpus, aufgehellt abgesetzt
    $flap = New-Object System.Drawing.Drawing2D.GraphicsPath
    Add-RoundedRect $flap (112 * $unit) (164 * $unit) (288 * $unit) (124 * $unit) (40 * $unit)
    $g.SetClip($flap, [System.Drawing.Drawing2D.CombineMode]::Intersect)
    $flapBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(38, 22, 35, 63))
    $g.FillPath($flapBrush, $flap)
    $flapBrush.Dispose()
    $g.ResetClip()
    $flap.Dispose()

    # Verschluss-Lasche in Teal
    $clasp = New-Object System.Drawing.Drawing2D.GraphicsPath
    Add-RoundedRect $clasp (268 * $unit) (238 * $unit) (132 * $unit) (60 * $unit) (30 * $unit)
    $teal = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 47, 167, 159))
    $g.FillPath($teal, $clasp)
    $teal.Dispose()
    $clasp.Dispose()

    # Nut im Verschluss
    $hole = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(209, 11, 18, 32))
    $g.FillEllipse($hole, (305 * $unit), (251 * $unit), (34 * $unit), (34 * $unit))
    $hole.Dispose()

    $g.ResetTransform()
    $g.Dispose()

    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
    Write-Output "  $([System.IO.Path]::GetFileName($Path))  ${Size}x${Size}"
}

# Reguläre Icons: eigene Rundung, Marke randnah.
New-Icon -Size 192 -Path "$OutDir\icon-192.png"
New-Icon -Size 512 -Path "$OutDir\icon-512.png"

# Maskable: randlos, Marke auf 62% — bleibt damit innerhalb der Safe Zone,
# egal welche Form Android darüber legt (Kreis, Squircle, Tropfen).
New-Icon -Size 192 -Path "$OutDir\icon-maskable-192.png" -MarkScale 0.62 -CornerRatio 0
New-Icon -Size 512 -Path "$OutDir\icon-maskable-512.png" -MarkScale 0.62 -CornerRatio 0

# iOS Home-Bildschirm: randlos und ohne Transparenz — iOS rundet selbst und
# unterlegt Transparenz sonst mit Schwarz.
New-Icon -Size 180 -Path "$OutDir\apple-touch-icon.png" -MarkScale 0.82 -CornerRatio 0
