// Email de confirmation candidature coliving — source unique.
//
// Utilise par les DEUX portes d'entree, pour qu'un lead vive exactement le meme
// parcours quelle que soit son origine :
//   - formulaire du site      -> src/pages/api/form/candidater.ts
//   - Meta Instant Form       -> workers/meta-leads/index.ts (import relatif)
//
// Ne rien importer ici : ce module est bundle dans un Worker autonome qui n'a
// ni Astro, ni les alias `~/`.

/** Plaquette 17 pages servie par le site (public/documents/). Doit etre en ligne AVANT le worker. */
export const PLAQUETTE_URL = 'https://laom.fr/documents/presentation-coliving-laom-aout-2026.pdf'
export const PLAQUETTE_FILENAME = 'LAOM - Coliving aout 2026 - Presentation.pdf'

/** Echappe une valeur avant insertion dans le HTML de l'email (anti-injection). */
const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

/**
 * Payload Resend complet du mail candidat (objet + corps + plaquette en piece jointe).
 * `attachments[].path` : Resend telecharge le PDF lui-meme, on n'embarque pas
 * 2,3 Mo de base64 dans le bundle du Worker.
 */
export function candidatureConfirmationEmail(firstName: string) {
  const utm = '?utm_source=email&utm_medium=transactional&utm_campaign=candidature-confirmation'
  const prenom = esc(firstName || 'à toi')

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;color:#1D1B18;line-height:1.65;font-size:16px">
  <p>Bonjour ${prenom},</p>

  <p>Un grand merci d'avoir pris le temps de candidater pour les semaines de coliving LAOM du mois d'août. On a lu ta candidature avec attention, et on est vraiment contents de voir que ce qu'on construit ici te parle.</p>

  <p>La prochaine étape est toute simple : <strong>un échange de 15 minutes par téléphone</strong>. Pas de pitch, pas de pression. On fait connaissance, on répond à tes questions et on regarde ensemble si LAOM est fait pour toi.</p>

  <p><strong>Quand es-tu disponible pour qu'on puisse échanger ou s'appeler directement ?</strong> Dis-nous le créneau qui t'arrange, on s'adapte.</p>

  <p>En attendant, tu trouveras en pièce jointe la présentation complète du séjour : le lieu, la journée type, le programme, les trois semaines d'août et le prix. Et si tu as envie de nous connaître dans notre intégralité, le domaine, le projet, celles et ceux qui le font vivre, tout est sur notre site : <a href="https://laom.fr/${utm}" style="color:#9A3922">laom.fr</a></p>

  <p style="margin:28px 0">
    <a href="${PLAQUETTE_URL}${utm}" style="display:inline-block;background:#9A3922;color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600">Voir la présentation</a>
    <br/><span style="font-size:13px;color:#8A8378">(également en pièce jointe de cet email)</span>
  </p>

  <p>À très vite,<br/>
  <strong>LAOM</strong> · La Margue, sud Aveyron</p>
</div>`

  return {
    from: 'Charly de LAOM <hello@laom.fr>',
    reply_to: 'laomcoliving@gmail.com',
    subject: 'Ta candidature est bien reçue 🌿',
    html,
    attachments: [{ filename: PLAQUETTE_FILENAME, path: PLAQUETTE_URL }],
  }
}
