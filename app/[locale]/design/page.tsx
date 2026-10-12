import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reference de style",
  robots: { index: false, follow: false },
};

/*
  Le token `primary` ne vaut pas la meme couleur en clair (marine) et en
  sombre (or) : la pastille doit donc afficher la valeur du mode courant,
  sinon elle ment. D'ou un hex par mode plutot qu'un hex unique.
*/
const PALETTE = [
  { token: "primary", cls: "bg-primary text-primary-foreground", light: "#000A2B", dark: "#E0B84A" },
  { token: "accent", cls: "bg-accent text-accent-foreground", light: "#C99F2F", dark: "#E0B84A" },
  { token: "promo", cls: "bg-promo text-promo-foreground", light: "#B91C1C", dark: "#F87171" },
  { token: "success", cls: "bg-success text-success-foreground", light: "#15803D", dark: "#4ADE80" },
  { token: "secondary", cls: "bg-secondary text-secondary-foreground", light: "#E2E8F0", dark: "#1B2447" },
  { token: "muted", cls: "bg-muted text-muted-foreground", light: "#F1F5F9", dark: "#131B3D" },
];

function Swatch({ token, cls, hex }: { token: string; cls: string; hex: string }) {
  return (
    <div className={`${cls} rounded-md px-4 py-6`}>
      <div className="text-sm font-semibold">{token}</div>
      <div className="tabular-price mt-1 text-xs opacity-80">{hex}</div>
    </div>
  );
}

/** Carte produit : structure reprise du site de reference, corrigee. */
function ProductCard() {
  return (
    <article className="bg-card text-card-foreground flex w-64 flex-col rounded-lg border p-4">
      <div className="bg-muted mb-3 flex aspect-square items-center justify-center rounded-md">
        <span className="text-muted-foreground text-xs">image produit</span>
      </div>
      <div className="mb-1 flex items-start justify-between gap-2">
        <h3 className="text-sm leading-snug font-semibold">
          Glucometre Accu-Chek Guide
        </h3>
      </div>
      <p className="text-muted-foreground mb-3 text-xs">Roche</p>

      {/*
        `flex-wrap` + `whitespace-nowrap` : la rangee passe a la ligne entre
        les elements plutot que de couper "28 500 FCFA" au milieu.
      */}
      <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="tabular-price text-lg font-bold whitespace-nowrap">
          28 500 FCFA
        </span>
        <span className="tabular-price text-muted-foreground text-xs whitespace-nowrap line-through">
          35 000 FCFA
        </span>
        <span className="bg-promo text-promo-foreground rounded px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap">
          -19%
        </span>
      </div>

      <span className="text-success mb-3 inline-flex items-center gap-1.5 text-xs font-medium">
        {/* L'information n'est pas portee par la couleur seule : un point + un mot. */}
        <span aria-hidden className="bg-success size-1.5 rounded-full" />
        En stock
      </span>

      {/* Cible tactile >= 44px de haut. */}
      <button className="bg-primary text-primary-foreground hover:bg-primary/90 min-h-11 w-full cursor-pointer rounded-md text-sm font-semibold transition-colors">
        Ajouter au panier
      </button>
    </article>
  );
}

function Showcase({ mode }: { mode: "light" | "dark" }) {
  return (
    <div className="bg-background text-foreground space-y-10 p-8">
      <section>
        <h2 className="mb-4 text-lg">Palette</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {PALETTE.map((c) => (
            <Swatch
              key={c.token}
              token={c.token}
              cls={c.cls}
              hex={mode === "dark" ? c.dark : c.light}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg">Typographie</h2>
        {/* Butler, H1 seulement, jamais sous 28px. */}
        <h1 className="text-4xl">Tensiomètres connectés</h1>
        <p className="text-muted-foreground mt-1 text-xs">
          H1 — Butler Bold. Police decorative : en grand, et en rare.
        </p>

        <h2 className="mt-6 text-2xl">Nos catégories de produits</h2>
        <p className="text-muted-foreground mt-1 text-xs">H2 — Montserrat 600</p>

        <h3 className="mt-4 text-xl">Caractéristiques techniques</h3>
        <p className="text-muted-foreground mt-1 text-xs">H3 — Montserrat 600</p>

        <p className="text-foreground mt-4 max-w-[65ch] leading-relaxed">
          Corps de texte en Noto Sans, 16 px, interlignage 1.6. La mesure est
          limitée à 65 caractères pour rester lisible. Une partie de la
          clientèle d&apos;un site de matériel médical est âgée ou malvoyante :
          le corps de texte ne descend jamais sous 16 px.
        </p>
        <p className="text-muted-foreground mt-2 text-sm">
          Bandelettes réactives &amp; lancettes stériles — l&apos;unité. Texte
          secondaire, 7.56:1 sur carte.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-lg">Actions</h2>
        <div className="flex flex-wrap items-center gap-3">
          <button className="bg-primary text-primary-foreground hover:bg-primary/90 min-h-11 cursor-pointer rounded-md px-5 text-sm font-semibold transition-colors">
            Action primaire
          </button>
          {/* Or = surface. Le libelle pose dessus est marine, jamais blanc. */}
          <button className="bg-accent text-accent-foreground hover:bg-accent/90 min-h-11 cursor-pointer rounded-md px-5 text-sm font-semibold transition-colors">
            Rechercher
          </button>
          <button className="border-input text-foreground hover:bg-secondary min-h-11 cursor-pointer rounded-md border px-5 text-sm font-semibold transition-colors">
            Secondaire
          </button>
          <button
            disabled
            className="bg-primary text-primary-foreground min-h-11 cursor-not-allowed rounded-md px-5 text-sm font-semibold opacity-50"
          >
            Desactive
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg">Champ de saisie</h2>
        <div className="max-w-sm">
          <label htmlFor="demo-email" className="mb-1.5 block text-sm font-medium">
            Adresse email
          </label>
          <input
            id="demo-email"
            type="email"
            placeholder="vous@exemple.cm"
            className="border-input bg-card min-h-11 w-full rounded-md border px-3 text-base"
          />
          <p className="text-muted-foreground mt-1.5 text-xs">
            Le libelle est visible, pas seulement dans le placeholder.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg">Carte produit</h2>
        <ProductCard />
      </section>
    </div>
  );
}

export default function DesignPage() {
  return (
    <main id="contenu" className="min-h-full">
      <div className="border-b p-8">
        <h1 className="text-3xl">e-Doctor TIM Marketplace — Référence de style</h1>
        <p className="text-muted-foreground mt-2 max-w-[65ch] text-sm">
          Page interne, non indexee. Elle rend les tokens de{" "}
          <code>app/globals.css</code>. Les ratios de contraste sont verifies
          par <code>scripts/check-contrast.py</code>.
        </p>
      </div>

      <Showcase mode="light" />

      <div className="dark">
        <div className="bg-background border-t px-8 pt-8">
          <p className="text-muted-foreground text-xs tracking-wide uppercase">
            Mode sombre
          </p>
        </div>
        <Showcase mode="dark" />
      </div>
    </main>
  );
}
