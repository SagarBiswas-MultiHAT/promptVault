import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function generateOgImage() {
  console.log('🎨 Generating 1200x630 Open Graph & Twitter Social Card for PromptVault...');

  const logoPath = path.resolve('public/logo.png');
  const logoBase64 = fs.existsSync(logoPath)
    ? `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`
    : '';

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      width: 1200px;
      height: 630px;
      overflow: hidden;
      background-color: #08090A;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: #EAEDF3;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      -webkit-font-smoothing: antialiased;
    }

    /* Ambient Glow Backgrounds */
    .glow-amber {
      position: absolute;
      top: -120px;
      left: -100px;
      width: 650px;
      height: 650px;
      background: radial-gradient(circle, rgba(245, 158, 11, 0.18) 0%, rgba(245, 158, 11, 0) 70%);
      filter: blur(50px);
      z-index: 1;
    }

    .glow-indigo {
      position: absolute;
      bottom: -150px;
      right: -100px;
      width: 700px;
      height: 700px;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.16) 0%, rgba(99, 102, 241, 0) 70%);
      filter: blur(60px);
      z-index: 1;
    }

    .glow-emerald {
      position: absolute;
      top: 50%;
      left: 45%;
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0) 70%);
      filter: blur(40px);
      z-index: 1;
    }

    /* Grid Overlay */
    .grid-pattern {
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
      background-size: 40px 40px;
      z-index: 2;
    }

    /* Main Container Frame */
    .card-frame {
      position: relative;
      z-index: 10;
      width: 1120px;
      height: 550px;
      background: rgba(17, 18, 20, 0.75);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 28px;
      padding: 44px 50px;
      display: flex;
      gap: 40px;
      box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    /* Left Column: Branding & Features */
    .left-col {
      flex: 1.15;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      z-index: 10;
    }

    .brand-header {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .logo-img {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(245, 158, 11, 0.25);
    }

    .brand-title-wrap {
      display: flex;
      flex-direction: column;
    }

    .brand-title {
      font-size: 34px;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .version-pill {
      font-size: 13px;
      font-weight: 700;
      padding: 3px 9px;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.35);
      color: #F59E0B;
      border-radius: 9999px;
      letter-spacing: 0;
    }

    .headline {
      margin-top: 14px;
      font-size: 38px;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.03em;
      background: linear-gradient(135deg, #FFFFFF 0%, #E2E8F0 60%, #94A3B8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .subheadline {
      margin-top: 10px;
      font-size: 16px;
      line-height: 1.5;
      color: #9CA3AF;
      max-width: 520px;
    }

    /* Badges list */
    .badges-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      color: #D1D5DB;
    }

    .badge-amber {
      border-color: rgba(245, 158, 11, 0.25);
      background: rgba(245, 158, 11, 0.08);
      color: #FBBF24;
    }

    .badge-blue {
      border-color: rgba(99, 102, 241, 0.25);
      background: rgba(99, 102, 241, 0.08);
      color: #818CF8;
    }

    .badge-emerald {
      border-color: rgba(16, 185, 129, 0.25);
      background: rgba(16, 185, 129, 0.08);
      color: #34D399;
    }

    /* Footer meta */
    .footer-bar {
      display: flex;
      align-items: center;
      gap: 20px;
      font-size: 14px;
      color: #6B7280;
      font-family: 'JetBrains Mono', monospace;
      padding-top: 14px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .domain-tag {
      color: #F59E0B;
      font-weight: 600;
    }

    /* Right Column: Code & UI Mockup Card */
    .right-col {
      flex: 0.95;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .preview-card {
      width: 100%;
      height: 100%;
      background: #111214;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7);
    }

    .card-header {
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .traffic-dots {
      display: flex;
      gap: 6px;
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .dot-red { background: #EF4444; }
    .dot-yellow { background: #F59E0B; }
    .dot-green { background: #10B981; }

    .card-tab-title {
      font-size: 12px;
      font-family: 'JetBrains Mono', monospace;
      color: #9CA3AF;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .score-badge {
      font-size: 11px;
      font-weight: 700;
      color: #10B981;
      background: rgba(16, 185, 129, 0.12);
      padding: 2px 7px;
      border-radius: 6px;
      border: 1px solid rgba(16, 185, 129, 0.25);
    }

    .card-body {
      padding: 20px;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-family: 'JetBrains Mono', monospace;
    }

    .prompt-title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .prompt-title {
      font-size: 16px;
      font-weight: 700;
      color: #FFFFFF;
      font-family: 'Inter', sans-serif;
    }

    .prompt-cat {
      font-size: 11px;
      color: #F59E0B;
      background: rgba(245, 158, 11, 0.1);
      padding: 2px 8px;
      border-radius: 6px;
      border: 1px solid rgba(245, 158, 11, 0.2);
    }

    .code-box {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 14px;
      font-size: 13px;
      line-height: 1.6;
      color: #D1D5DB;
      flex: 1;
      margin-bottom: 14px;
    }

    .kw { color: #818CF8; font-weight: 600; }
    .var {
      color: #F59E0B;
      background: rgba(245, 158, 11, 0.15);
      padding: 1px 5px;
      border-radius: 4px;
      border: 1px solid rgba(245, 158, 11, 0.3);
      font-weight: 600;
    }
    .str { color: #34D399; }
    .comment { color: #6B7280; font-style: italic; }

    .card-actions {
      display: flex;
      gap: 10px;
    }

    .btn-mock {
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: 'Inter', sans-serif;
    }

    .btn-mock-primary {
      background: #F59E0B;
      color: #08090A;
      border: none;
    }

    .btn-mock-secondary {
      background: rgba(255, 255, 255, 0.05);
      color: #E5E7EB;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
  </style>
</head>
<body>
  <!-- Ambient Glows -->
  <div class="glow-amber"></div>
  <div class="glow-indigo"></div>
  <div class="glow-emerald"></div>
  <div class="grid-pattern"></div>

  <!-- Main 1200x630 Card Frame -->
  <div class="card-frame">
    <!-- Left Column -->
    <div class="left-col">
      <div>
        <div class="brand-header">
          ${logoBase64 ? `<img class="logo-img" src="${logoBase64}" alt="PromptVault Logo" />` : ''}
          <div class="brand-title-wrap">
            <div class="brand-title">
              PromptVault
              <span class="version-pill">v2.1.0</span>
            </div>
          </div>
        </div>

        <h1 class="headline">Your Private AI<br>Prompt Library</h1>
        
        <p class="subheadline">
          Privacy-first, client-encrypted prompt workbench with AI evaluation, dynamic variables, and offline-first storage.
        </p>

        <div class="badges-grid">
          <div class="badge badge-amber">🔒 AES-256-GCM Encrypted</div>
          <div class="badge badge-blue">⚡ Offline-First</div>
          <div class="badge badge-emerald">✨ Gemini & Groq AI</div>
          <div class="badge">☁️ Cloud Sync</div>
          <div class="badge">📦 100% Open Source</div>
        </div>
      </div>

      <div class="footer-bar">
        <span class="domain-tag">https://promptvault.multihat.dev</span>
        <span>•</span>
        <span>Apache-2.0 License</span>
      </div>
    </div>

    <!-- Right Column: Interactive UI Mockup -->
    <div class="right-col">
      <div class="preview-card">
        <div class="card-header">
          <div class="traffic-dots">
            <div class="dot dot-red"></div>
            <div class="dot dot-yellow"></div>
            <div class="dot dot-green"></div>
          </div>
          <div class="card-tab-title">
            <span>⚡ system-architect.prompt</span>
          </div>
          <div class="score-badge">Score: 98/100</div>
        </div>

        <div class="card-body">
          <div class="prompt-title-row">
            <div class="prompt-title">Senior System Architect</div>
            <div class="prompt-cat">Engineering</div>
          </div>

          <div class="code-box">
            <span class="comment">// Dynamic Prompt Template</span><br>
            <span class="kw">Act as</span> a Principal Cloud Architect.<br>
            Design a resilient architecture for<br>
            <span class="var">{{project_name}}</span> using <span class="var">{{stack}}</span>.<br>
            Ensure <span class="str">zero-trust security</span> and<br>
            auto-scaling across <span class="var">{{cloud_region}}</span>.
          </div>

          <div class="card-actions">
            <div class="btn-mock btn-mock-primary">⚡ Copy Prompt</div>
            <div class="btn-mock btn-mock-secondary">✨ AI Optimize</div>
            <div class="btn-mock btn-mock-secondary">🔒 Encrypted</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2, // Generates ultra-crisp Retina 2x image for HD displays
  });

  const page = await context.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });

  // Wait for Google fonts to finish loading
  await page.evaluate(async () => {
    // @ts-ignore
    await document.fonts.ready;
  });

  const outputPath = path.resolve('public/og-image.png');
  await page.screenshot({
    path: outputPath,
    type: 'png',
    clip: { x: 0, y: 0, width: 1200, height: 630 },
  });

  await browser.close();
  console.log(`✅ Successfully generated 1200x630 OG image at: ${outputPath}`);
}

generateOgImage().catch((err) => {
  console.error('❌ Failed to generate OG image:', err);
  process.exit(1);
});
