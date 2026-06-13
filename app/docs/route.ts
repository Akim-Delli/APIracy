const customCss = `
.scalar-app, .scalar-api-reference {
  --scalar-background-1: #0a0a12;
  --scalar-background-2: #0f0f1a;
  --scalar-background-3: #15151f;
  --scalar-background-accent: rgba(168, 85, 247, 0.16);
  --scalar-border-color: rgba(255, 255, 255, 0.08);
  --scalar-color-1: #e7e7ef;
  --scalar-color-2: #a1a1aa;
  --scalar-color-3: #71717a;
  --scalar-color-accent: #d946ef;
  --scalar-button-1: #8b5cf6;
  --scalar-sidebar-background-1: rgba(6, 6, 10, 0.7);
  --scalar-sidebar-color-1: #e7e7ef;
  --scalar-sidebar-color-2: #a1a1aa;
  --scalar-sidebar-border-color: rgba(255, 255, 255, 0.08);
  --scalar-sidebar-item-hover-background: rgba(168, 85, 247, 0.1);
  --scalar-sidebar-item-active-background: rgba(168, 85, 247, 0.16);
  --scalar-sidebar-color-active: #f0abfc;
}`;

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
        darkMode: true,
        forceDarkModeState: "dark",
        hideDarkModeToggle: true,
        hideClientButton: true,
        customCss: ${JSON.stringify(customCss)},
      });
    </script>
  </body>
</html>`;

export async function GET(): Promise<Response> {
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
