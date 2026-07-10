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

const NAVY = "#000A2B";
const MUTED = "#4B5563";

/** Accusé de réception client. Ne confirme PAS la commande : elle reste à valider. */
export function OrderReceiptEmail({ order }: { order: Order }) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>{`Nous avons bien reçu votre demande ${order.reference}`}</Preview>
      <Body style={{ backgroundColor: "#F1F5F9", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ backgroundColor: "#FFFFFF", padding: "24px", maxWidth: "600px" }}>
          <Heading style={{ color: NAVY, fontSize: "20px", margin: "0 0 12px" }}>
            Merci, {order.customer.fullName.split(" ")[0]}.
          </Heading>

          <Text style={{ fontSize: "14px", lineHeight: "22px" }}>
            Nous avons bien reçu votre demande de commande. Votre référence est{" "}
            <strong>{order.reference}</strong>. Conservez-la, notre support vous la
            demandera.
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
              <strong>Cette commande n&apos;est pas encore confirmée</strong> et aucun
              paiement n&apos;a été effectué. Notre équipe vous contacte sous 24 à 48 h
              ouvrées pour confirmer la disponibilité, les frais de livraison et le
              règlement.
            </Text>
          </Section>

          <Heading as="h2" style={{ fontSize: "15px", color: NAVY }}>
            Votre sélection
          </Heading>
          {order.items.map((item) => (
            <Text key={item.productId} style={{ fontSize: "13px", margin: "4px 0" }}>
              {item.quantity} × {item.name} — {formatXaf(item.lineTotal)}
            </Text>
          ))}

          <Hr style={{ borderColor: "#E2E8F0", margin: "16px 0" }} />

          {/* Le detail n'apparait que s'il y a une remise : sinon la ligne serait doublee. */}
          {order.promo && (
            <>
              <Text style={{ fontSize: "13px", margin: 0 }}>
                Sous-total : {formatXaf(order.subtotal)}
              </Text>
              <Text style={{ fontSize: "13px", margin: "4px 0 0" }}>
                Code promo {order.promo.code} (−{order.promo.percent} %) : −
                {formatXaf(order.promo.discount)}
              </Text>
            </>
          )}

          <Text style={{ fontSize: "14px", fontWeight: "bold", margin: "8px 0 0" }}>
            Sous-total : {formatXaf(order.netSubtotal)}
          </Text>
          <Text style={{ color: MUTED, fontSize: "12px", margin: "4px 0 0" }}>
            Frais de livraison communiqués lors de la confirmation.
          </Text>

          <Hr style={{ borderColor: "#E2E8F0", margin: "20px 0" }} />

          <Text style={{ color: MUTED, fontSize: "11px", lineHeight: "17px" }}>
            Dispositifs médicaux — lisez attentivement la notice avant utilisation. Ces
            informations ne remplacent pas l&apos;avis d&apos;un professionnel de santé.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default OrderReceiptEmail;
