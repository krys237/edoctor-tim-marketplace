import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import { formatXaf } from "@/lib/money";
import type { Order } from "@/lib/order";
import { emailTranslator } from "@/lib/translator";

const NAVY = "#000A2B";
const MUTED = "#4B5563";

/**
 * Accusé de réception client, dans la langue de la commande (`order.locale`).
 * Ne confirme PAS la commande : elle reste à valider.
 *
 * Rendu hors de l'arbre React de la page (react-email) : pas de
 * `useTranslations`, le traducteur est construit directement depuis les
 * messages. Les montants sont formates dans la meme langue.
 */
export function OrderReceiptEmail({ order }: { order: Order }) {
  const t = emailTranslator(order.locale);
  const xaf = (amount: number) => formatXaf(amount, order.locale);
  const strong = (chunks: React.ReactNode) => <strong>{chunks}</strong>;

  return (
    <Html lang={order.locale}>
      <Head />
      <Preview>{t("preview", { reference: order.reference })}</Preview>
      <Body style={{ backgroundColor: "#F1F5F9", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ backgroundColor: "#FFFFFF", padding: "24px", maxWidth: "600px" }}>
          <Heading style={{ color: NAVY, fontSize: "20px", margin: "0 0 12px" }}>
            {t("greeting", { firstName: order.customer.fullName.split(" ")[0] })}
          </Heading>

          <Text style={{ fontSize: "14px", lineHeight: "22px" }}>
            {t.rich("intro", { reference: order.reference, strong })}
          </Text>

          {/*
            Mention non negociable : le client ne doit pas croire que sa commande
            est confirmee ni qu'un paiement a eu lieu.
          */}
          <Section
            style={{
              backgroundColor: "#FEF3C7",
              borderLeft: `4px solid #C99F2F`,
              padding: "12px",
              margin: "16px 0",
            }}
          >
            <Text style={{ fontSize: "13px", margin: 0, color: NAVY }}>
              {t.rich("warning", { strong })}
            </Text>
          </Section>

          <Heading as="h2" style={{ fontSize: "15px", color: NAVY }}>
            {t("selectionTitle")}
          </Heading>
          {order.items.map((item) => (
            <Text key={item.productId} style={{ fontSize: "13px", margin: "4px 0" }}>
              {t("line", { quantity: item.quantity, name: item.name, amount: xaf(item.lineTotal) })}
            </Text>
          ))}

          <Hr style={{ borderColor: "#E2E8F0", margin: "16px 0" }} />

          {/* Le detail n'apparait que s'il y a une remise : sinon la ligne serait doublee. */}
          {order.promo && (
            <>
              <Text style={{ fontSize: "13px", margin: 0 }}>
                {t("subtotal", { amount: xaf(order.subtotal) })}
              </Text>
              <Text style={{ fontSize: "13px", margin: "4px 0 0" }}>
                {t("promoLine", {
                  code: order.promo.code,
                  percent: order.promo.percent,
                  amount: xaf(order.promo.discount),
                })}
              </Text>
            </>
          )}

          <Text style={{ fontSize: "14px", fontWeight: "bold", margin: "8px 0 0" }}>
            {t("netSubtotal", { amount: xaf(order.netSubtotal) })}
          </Text>
          <Text style={{ color: MUTED, fontSize: "12px", margin: "4px 0 0" }}>
            {t("shippingNote")}
          </Text>

          <Hr style={{ borderColor: "#E2E8F0", margin: "20px 0" }} />

          <Text style={{ color: MUTED, fontSize: "11px", lineHeight: "17px" }}>
            {t("medicalNotice")}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default OrderReceiptEmail;
