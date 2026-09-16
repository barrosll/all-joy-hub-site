// Restringe o acesso ao ambiente de staging (branch deploys) apenas a
// visitantes vindos de Portugal, usando os dados de geolocalização que
// o Netlify já fornece em toda Edge Function. A produção (main) nunca
// passa por este bloqueio.

export default async (request, context) => {
  const siteContext = Netlify.env.get("CONTEXT"); // 'production' | 'deploy-preview' | 'branch-deploy' | 'dev'

  // só restringe deploys de branch (o nosso ambiente de teste)
  if (siteContext !== "branch-deploy") {
    return;
  }

  const country = context.geo?.country?.code;

  if (country && country !== "PT") {
    return new Response(
      "Este ambiente de teste da All Joy Hub está disponível apenas a partir de Portugal.",
      {
        status: 403,
        headers: { "content-type": "text/plain; charset=utf-8" },
      }
    );
  }
};

export const config = { path: "/*" };
