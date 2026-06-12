const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>APIracy — API Reference</title>
  </head>
  <body>
    <div id="app"></div>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
    <script>
      Scalar.createApiReference("#app", {
        url: "/api/openapi.json",
        theme: "purple",
        hideClientButton: true,
      });
    </script>
  </body>
</html>`;

export async function GET(): Promise<Response> {
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
