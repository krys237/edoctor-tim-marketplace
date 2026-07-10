"""
Verifie que chaque paire de tokens de app/globals.css respecte les seuils WCAG.

    python scripts/check-contrast.py

Sort en code 1 si une paire echoue. Toute modification de la palette dans
app/globals.css doit etre repercutee ici, puis ce script relance.

Seuils (WCAG 2.1) :
  - 1.4.3 Contraste minimum ....... 4.5:1 pour le texte courant
  - 1.4.11 Contraste non-textuel .. 3:1 pour les contours fonctionnels
    (bordure de champ, anneau de focus). Les separateurs purement
    decoratifs en sont exemptes.
"""

import sys


def _linearize(channel: int) -> float:
    c = channel / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def luminance(hex_color: str) -> float:
    h = hex_color.lstrip("#")
    r, g, b = (int(h[i : i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * _linearize(r) + 0.7152 * _linearize(g) + 0.0722 * _linearize(b)


def contrast(fg: str, bg: str) -> float:
    la, lb = luminance(fg), luminance(bg)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


LIGHT = {
    "background": "#F1F5F9",
    "card": "#FFFFFF",
    "foreground": "#111827",
    "muted_foreground": "#4B5563",
    "input": "#64748B",
    "ring": "#000A2B",
    "primary": "#000A2B",
    "primary_foreground": "#FFFFFF",
    "accent": "#C99F2F",
    "accent_foreground": "#000A2B",
    "gold_700": "#8F7121",
    "destructive": "#B91C1C",
    "destructive_foreground": "#FFFFFF",
    "success": "#15803D",
    "success_foreground": "#FFFFFF",
}

DARK = {
    "background": "#05091A",
    "card": "#0E1533",
    "foreground": "#E8EDF7",
    "muted_foreground": "#A3B0C7",
    "input": "#6B7A9E",
    "ring": "#E0B84A",
    "primary": "#E0B84A",
    "primary_foreground": "#05091A",
    "accent": "#E0B84A",
    "accent_foreground": "#05091A",
    "destructive": "#F87171",
    "destructive_foreground": "#05091A",
    "success": "#4ADE80",
    "success_foreground": "#05091A",
}


def pairs(t: dict, light: bool):
    # (libelle, premier plan, arriere plan, seuil)
    out = [
        ("texte principal / carte", t["foreground"], t["card"], 4.5),
        ("texte principal / fond page", t["foreground"], t["background"], 4.5),
        ("texte secondaire / carte", t["muted_foreground"], t["card"], 4.5),
        ("texte secondaire / fond page", t["muted_foreground"], t["background"], 4.5),
        ("label bouton primaire", t["primary_foreground"], t["primary"], 4.5),
        ("label bouton accent (or)", t["accent_foreground"], t["accent"], 4.5),
        ("label badge promo", t["destructive_foreground"], t["destructive"], 4.5),
        ("label badge succes", t["success_foreground"], t["success"], 4.5),
        ("bordure de champ / carte", t["input"], t["card"], 3.0),
        ("anneau de focus / fond page", t["ring"], t["background"], 3.0),
        ("anneau de focus / carte", t["ring"], t["card"], 3.0),
    ]
    if light:
        out.append(("or fonce en texte / carte", t["gold_700"], t["card"], 4.5))
    return out


def main() -> int:
    failures = 0
    for label, tokens, is_light in (("CLAIR", LIGHT, True), ("SOMBRE", DARK, False)):
        print(f"\n===== MODE {label} =====")
        print(f"{'Paire':<32} {'mesure':>9} {'seuil':>7}  etat")
        print("-" * 62)
        for name, fg, bg, threshold in pairs(tokens, is_light):
            ratio = contrast(fg, bg)
            ok = ratio >= threshold
            failures += 0 if ok else 1
            print(
                f"{name:<32} {ratio:>8.2f}:1 {threshold:>6.1f}  "
                f"{'OK' if ok else 'ECHEC'}"
            )

    print("\n" + "=" * 62)
    if failures:
        print(f"ECHEC : {failures} paire(s) sous le seuil WCAG.")
        return 1
    print("OK : toutes les paires respectent les seuils WCAG.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
