import { getEmailFromAddress, getSmtpTransporter, isSmtpConfigured } from "@/lib/email/smtp";
import { formatPrice } from "@/lib/utils/format";

interface OrderMailItem {
  itemName: string;
  quantity: number;
  totalPrice: number;
}

interface SendOrderCreatedInput {
  to: string;
  customerName: string;
  orderId: string;
  totalAmount: number;
  currency?: string;
  items: OrderMailItem[];
}

interface SendOrderAuthorizedInput {
  to: string;
  customerName: string;
  orderId: string;
  unlockedFormations: string[];
}

function renderItems(items: OrderMailItem[], currency: string) {
  return items
    .map((item) => {
      const total = formatPrice(item.totalPrice, currency);
      return `<li style="margin-bottom:8px;"><strong>${item.itemName}</strong> x${item.quantity} - ${total}</li>`;
    })
    .join("");
}

export async function sendOrderCreatedEmail(input: SendOrderCreatedInput) {
  if (!isSmtpConfigured()) {
    console.warn("SMTP not configured, skipping order created email.");
    return;
  }

  const currency = input.currency || "USD";
  const transporter = getSmtpTransporter();
  const from = getEmailFromAddress();
  const total = formatPrice(input.totalAmount, currency);
  const itemsHtml = renderItems(input.items, currency);

  await transporter.sendMail({
    from,
    to: input.to,
    subject: `Commande recue (${input.orderId}) - Myke Industrie`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">
        <h2 style="margin-bottom:8px;">Bonjour ${input.customerName},</h2>
        <p>Votre commande <strong>${input.orderId}</strong> a bien ete enregistree.</p>
        <p>Montant total: <strong>${total}</strong></p>
        <p>Articles commandes:</p>
        <ul>${itemsHtml}</ul>
        <p style="margin-top:16px;">
          Votre commande est en cours de traitement. La livraison peut prendre jusqu'a
          <strong>24 heures maximum</strong>.
        </p>
        <p>Merci pour votre confiance.</p>
      </div>
    `,
  });
}

export async function sendOrderAuthorizedEmail(input: SendOrderAuthorizedInput) {
  if (!isSmtpConfigured()) {
    console.warn("SMTP not configured, skipping order authorized email.");
    return;
  }

  const transporter = getSmtpTransporter();
  const from = getEmailFromAddress();
  const formationsHtml =
    input.unlockedFormations.length > 0
      ? `<ul>${input.unlockedFormations
          .map((name) => `<li style="margin-bottom:6px;">${name}</li>`)
          .join("")}</ul>`
      : "<p>Vos articles numeriques sont disponibles dans votre compte.</p>";

  await transporter.sendMail({
    from,
    to: input.to,
    subject: `Commande autorisee (${input.orderId}) - Myke Industrie`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">
        <h2 style="margin-bottom:8px;">Bonjour ${input.customerName},</h2>
        <p>
          Votre commande <strong>${input.orderId}</strong> a ete autorisee par l'administration.
        </p>
        <p>Formations debloquees:</p>
        ${formationsHtml}
        <p style="margin-top:16px;">
          Vous pouvez consulter votre historique dans <strong>Mes commandes</strong>.
        </p>
      </div>
    `,
  });
}
