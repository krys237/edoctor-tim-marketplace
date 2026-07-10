import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";

import { formatXaf } from "@/lib/money";
import type { Order } from "@/lib/order";

const NAVY = "#000A2B";
const MUTED = "#4B5563";

export function OrderInternalEmail({ order }: { order: Order }) {
  const f = order.fulfillment;

  return (
    <Html lang="fr">
      <Head />
      <Preview>
        {`${order.reference} — ${order.items.length} référence(s) — ${formatXaf(order.netSubtotal)}`}
      </Preview>
      <Body style={{ backgroundColor: "#F1F5F9", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ backgroundColor: "#FFFFFF", padding: "24px", maxWidth: "640px" }}>
          <Heading style={{ color: NAVY, fontSize: "20px", margin: "0 0 4px" }}>
            Nouvelle commande {order.reference}
          </Heading>
          <Text style={{ color: MUTED, fontSize: "12px", margin: "0 0 16px" }}>
            Reçue le {new Date(order.submittedAt).toLocaleString("fr-FR")}
          </Text>

          {order.doctorCodeApplied && (
            <Section
              style={{
                backgroundColor: "#C99F2F",
                padding: "10px 12px",
                borderRadius: "4px",
                marginBottom: "16px",
              }}
            >
              {/* Texte marine sur or : blanc sur or échoue au contraste (2,48:1). */}
              <Text style={{ color: NAVY, fontSize: "13px", fontWeight: "bold", margin: 0 }}>
                Code médecin appliqué. Sous-total public :{" "}
                {formatXaf(order.publicSubtotal)}.
              </Text>
            </Section>
          )}

          <Heading as="h2" style={{ fontSize: "15px", color: NAVY }}>
            Client
          </Heading>
          <Text style={{ fontSize: "14px", margin: "4px 0" }}>
            {order.customer.fullName}
            <br />
            {order.customer.email}
            <br />
            {order.customer.phone}
          </Text>

          {order.business?.companyName && (
            <>
              <Heading as="h2" style={{ fontSize: "15px", color: NAVY }}>
                Structure
              </Heading>
              <Text style={{ fontSize: "14px", margin: "4px 0" }}>
                {order.business.companyName}
                {order.business.taxId ? ` — NIU : ${order.business.taxId}` : ""}
              </Text>
            </>
          )}

          <Heading as="h2" style={{ fontSize: "15px", color: NAVY }}>
            {f.type === "delivery" ? "Livraison" : "Retrait en agence"}
          </Heading>
          {f.type === "delivery" ? (
            <Text style={{ fontSize: "14px", margin: "4px 0" }}>
              {f.addressLine1}
              {f.addressLine2 ? <><br />{f.addressLine2}</> : null}
              <br />
              {f.city}
              {f.instructions ? <><br />Instructions : {f.instructions}</> : null}
            </Text>
          ) : (
            <Text style={{ fontSize: "14px", margin: "4px 0" }}>
              {f.locationLabel ?? f.locationId}
            </Text>
          )}

          <Hr style={{ borderColor: "#E2E8F0", margin: "20px 0" }} />

          <Heading as="h2" style={{ fontSize: "15px", color: NAVY }}>
            Articles
          </Heading>
          {order.items.map((item) => (
            <Row key={item.productId} style={{ marginBottom: "6px" }}>
              <Column>
                <Text style={{ fontSize: "13px", margin: 0 }}>
                  <strong>{item.quantity} ×</strong> {item.name}
                  <br />
                  <span style={{ color: MUTED, fontSize: "11px" }}>
                    {item.sku} — {formatXaf(item.unitPrice)} l&apos;unité
                    {item.unitPrice !== item.publicUnitPrice
                      ? ` (public : ${formatXaf(item.publicUnitPrice)})`
                      : ""}
                  </span>
                </Text>
              </Column>
              <Column align="right" style={{ width: "110px" }}>
                <Text style={{ fontSize: "13px", fontWeight: "bold", margin: 0 }}>
                  {formatXaf(item.lineTotal)}
                </Text>
              </Column>
            </Row>
          ))}

          <Hr style={{ borderColor: "#E2E8F0", margin: "16px 0" }} />

          {/* Le detail n'apparait qu'en presence d'une remise : sinon les deux
              lignes porteraient le meme montant. */}
          {order.promo && (
            <>
              <Row>
                <Column>
                  <Text style={{ fontSize: "14px", margin: 0 }}>Sous-total</Text>
                </Column>
                <Column align="right">
                  <Text style={{ fontSize: "14px", margin: 0 }}>{formatXaf(order.subtotal)}</Text>
                </Column>
              </Row>
              <Row>
                <Column>
                  <Text style={{ fontSize: "14px", margin: "4px 0 0" }}>
                    Code promo {order.promo.code} (−{order.promo.percent} %)
                  </Text>
                </Column>
                <Column align="right">
                  <Text style={{ fontSize: "14px", margin: "4px 0 0" }}>
                    −{formatXaf(order.promo.discount)}
                  </Text>
                </Column>
              </Row>
            </>
          )}

          <Row>
            <Column>
              <Text style={{ fontSize: "14px", fontWeight: "bold", margin: "8px 0 0" }}>
                {order.promo ? "Sous-total à facturer" : "Sous-total"}
              </Text>
            </Column>
            <Column align="right">
              <Text
                style={{ fontSize: "16px", fontWeight: "bold", margin: "8px 0 0", color: NAVY }}
              >
                {formatXaf(order.netSubtotal)}
              </Text>
            </Column>
          </Row>

          <Text style={{ color: MUTED, fontSize: "11px", marginTop: "16px" }}>
            Frais de livraison non calculés. La commande complète est jointe au
            format JSON, réimportable telle quelle.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default OrderInternalEmail;
