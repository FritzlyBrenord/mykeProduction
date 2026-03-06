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

interface SendOrderShippedInput {
  to: string;
  customerName: string;
  orderId: string;
}

interface SendOrderDeliveredInput {
  to: string;
  customerName: string;
  orderId: string;
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
    subject: `Commande reçue (${input.orderId}) - Myke Industrie`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">
        <h2 style="margin-bottom:8px;">Bonjour ${input.customerName},</h2>
        <p>Votre commande <strong>${input.orderId}</strong> a bien été enregistrée.</p>
        <p>Montant total: <strong>${total}</strong></p>
        <p>Articles commandés:</p>
        <ul>${itemsHtml}</ul>
        <p style="margin-top:16px;">
          Votre commande est en cours de traitement. La livraison peut prendre jusqu'à
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
      : "<p>Vos articles numériques sont disponibles dans votre compte.</p>";

  await transporter.sendMail({
    from,
    to: input.to,
    subject: `Commande autorisée (${input.orderId}) - Myke Industrie`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">
        <h2 style="margin-bottom:8px;">Bonjour ${input.customerName},</h2>
        <p>
          Votre commande <strong>${input.orderId}</strong> a été autorisée par l'administration.
        </p>
        <p>Accès débloqués :</p>
        ${formationsHtml}
        <p style="margin-top:16px;">
          Vous pouvez consulter votre historique dans <strong>Mes commandes</strong>.
        </p>
      </div>
    `,
  });
}

export async function sendOrderShippedEmail(input: SendOrderShippedInput) {
  if (!isSmtpConfigured()) {
    console.warn("SMTP not configured, skipping order shipped email.");
    return;
  }

  const transporter = getSmtpTransporter();
  const from = getEmailFromAddress();

  await transporter.sendMail({
    from,
    to: input.to,
    subject: `Commande expédiée (${input.orderId}) - Myke Industrie`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">
        <h2 style="margin-bottom:8px;">Bonjour ${input.customerName},</h2>
        <p>Bonne nouvelle ! Votre commande <strong>${input.orderId}</strong> a été expédiée.</p>
        <p>Elle est maintenant en route vers votre adresse de livraison.</p>
        <p style="margin-top:16px;">
          Vous pouvez suivre l'avancement dans votre espace <strong>Compte > Mes commandes</strong>.
        </p>
        <p>Merci pour votre achat !</p>
      </div>
    `,
  });
}

export async function sendOrderDeliveredEmail(input: SendOrderDeliveredInput) {
  if (!isSmtpConfigured()) {
    console.warn("SMTP not configured, skipping order delivered email.");
    return;
  }

  const transporter = getSmtpTransporter();
  const from = getEmailFromAddress();

  await transporter.sendMail({
    from,
    to: input.to,
    subject: `Commande livrée (${input.orderId}) - Myke Industrie`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">
        <h2 style="margin-bottom:8px;">Bonjour ${input.customerName},</h2>
        <p>Votre commande <strong>${input.orderId}</strong> a été marquée comme livrée.</p>
        <p>Nous espérons que vos produits vous donneront entière satisfaction.</p>
        <p style="margin-top:16px;">
          Si vous avez la moindre question, n'hésitez pas à nous contacter.
        </p>
        <p>À bientôt sur Myke Industrie !</p>
      </div>
    `,
  });
}
