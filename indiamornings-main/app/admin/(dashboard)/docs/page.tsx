export default function AdminDocsPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ marginBottom: 40, borderBottom: "2px solid var(--brand)", paddingBottom: 20 }}>
        <h1 style={{ fontSize: 36, margin: 0 }}>Administrator Guide</h1>
        <p style={{ fontSize: 18, color: "var(--text-muted)", marginTop: 10 }}>
          Welcome to the India Mornings CMS. Everything you need to know about managing the portal.
        </p>
      </div>

      {/* Sections */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>1. Content Management</h2>
        <h3 style={h3Style}>Adding Articles</h3>
        <p style={pStyle}>
          Navigate to <b>Articles</b> and click on "Add New". Fill in the title, content, and upload a compelling cover image. 
          Use the SEO fields (Meta Description, Focus Keyphrase) to ensure the article performs well on search engines.
        </p>
        
        <h3 style={h3Style}>Featured vs. Top Stories</h3>
        <ul style={pStyle}>
          <li style={{ marginBottom: 12 }}>
            <b>Featured Story:</b> The single most important story displayed at the top of the homepage. 
            The system automatically selects the <b>latest published article</b> from the "Top Stories" pool to be featured.
          </li>
          <li>
            <b>Top Stories:</b> These are your high-priority news items. Once published, they appear in the main grid on the homepage and their respective category pages.
          </li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>2. Review Queue & Workflow</h2>
        <p style={pStyle}>
          When a Journalist creates an article, it starts as a <b>DRAFT</b>. Once they submit it, its status changes to <b>IN_REVIEW</b>.
        </p>
        <div style={{ background: "#f3f4f6", padding: 20, borderRadius: 12, margin: "20px 0" }}>
          <h4 style={{ marginTop: 0 }}>The Process:</h4>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            <li style={{ marginBottom: 8 }}>Go to the <b>Review Queue</b>.</li>
            <li style={{ marginBottom: 8 }}>Click on an article to preview its content.</li>
            <li style={{ marginBottom: 8 }}><b>Approve:</b> Mark as "APPROVED" or "PUBLISHED" to make it live.</li>
            <li><b>Reject:</b> Change status back to "REJECTED" with notes for the journalist.</li>
          </ol>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>3. User Roles</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
          <thead>
            <tr style={{ textAlign: "left", background: "#f8f9fa", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: 12 }}>Role</th>
              <th style={{ padding: 12 }}>Permissions</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: 12 }}><b>Journalist</b></td>
              <td style={{ padding: 12 }}>Can create and edit their own articles,manage categories. Cannot publish directly.</td>
            </tr>
            <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: 12 }}><b>Admin</b></td>
              <td style={{ padding: 12 }}>Can review all articles, manage categories, and publish content.</td>
            </tr>
            <tr>
              <td style={{ padding: 12 }}><b>Super Admin</b></td>
              <td style={{ padding: 12 }}>Full access to user accounts, system configuration, and audit logs.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>4. Regions & Languages</h2>
        <p style={pStyle}>
          To reach specific audiences, always tag your articles with the correct <b>Region</b> (e.g., Maharashtra, Delhi) 
          and <b>Language</b> (English, Marathi, Hindi).
        </p>
        <p style={pStyle}>
           If an article is meant for a general audience, use the <b>"ALL"</b> tag. 
           Articles tagged as "ALL" are visible to every user regardless of their filter settings.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ ...h2Style, color: "#10b981" }}>5. Mastering HTML Formatting</h2>
        <p style={pStyle}>
          Since the content is written in HTML, you have full control over how your story looks. 
          Below are the essential tags you should use.
        </p>

        <div style={htmlGuideCard}>
          <h4 style={subHeadingStyle}>Headings (Structure)</h4>
          <p style={codeDescStyle}>Use headings to break up long blocks of text. <b>Never use H1</b> (it's reserved for the title).</p>
          <pre style={codeBlockStyle}>{`<h2>Sub-section Heading</h2>\n<h3>Minor Heading</h3>`}</pre>
        </div>

        <div style={htmlGuideCard}>
          <h4 style={subHeadingStyle}>Text Styling</h4>
          <p style={codeDescStyle}>Emphasis and highlight important terms.</p>
          <pre style={codeBlockStyle}>{`<strong>Bold Text</strong>\n<em>Italicized Text</em>\n<u>Underlined Text</u>`}</pre>
        </div>

        <div style={htmlGuideCard}>
          <h4 style={subHeadingStyle}>Lists</h4>
          <p style={codeDescStyle}>Perfect for bullet points or numbered steps.</p>
          <pre style={codeBlockStyle}>{`<ul>\n  <li>Bullet Point 1</li>\n  <li>Bullet Point 2</li>\n</ul>`}</pre>
        </div>

        <div style={htmlGuideCard}>
          <h4 style={subHeadingStyle}>Quotes (Professional Look)</h4>
          <p style={codeDescStyle}>Displays text with a stylized left border (excellent for expert opinions).</p>
          <pre style={codeBlockStyle}>{`<blockquote>\n  "This is a sample quote from an expert."\n</blockquote>`}</pre>
        </div>

        <div style={htmlGuideCard}>
          <h4 style={subHeadingStyle}>Images & Links</h4>
          <p style={codeDescStyle}>Embed visual content or link to external sources.</p>
          <pre style={codeBlockStyle}>{`<img src="IMAGE_URL" alt="Description" />\n<a href="URL">Clickable Link Text</a>`}</pre>
        </div>

        <div style={htmlGuideCard}>
          <h4 style={subHeadingStyle}>Videos & Embeds</h4>
          <p style={codeDescStyle}>Wrap YouTube or Social Media embeds in a div for better spacing.</p>
          <pre style={codeBlockStyle}>{`<div class="embed-container">\n  (Paste YouTube Iframe Here)\n</div>`}</pre>
        </div>
      </section>
      
      <section style={sectionStyle}>
        <h2 style={{ ...h2Style, color: "#3b82f6" }}>6. API Integration</h2>
        <p style={pStyle}>
          India Mornings provides a RESTful API for external services to interact with the platform. 
          To access these endpoints, you must use an <b>API Key</b>.
        </p>

        <h3 style={h3Style}>API Key Roles & Security</h3>
        <p style={pStyle}>
          When you generate a key, you assign it a <b>Role</b> (e.g., API Service, Journalist, Admin). 
          The key inherits the exact same permissions as a human user with that role.
        </p>
        <ul style={pStyle}>
          <li><b>API Service:</b> Read-only access to published content.</li>
          <li><b>Journalist:</b> Can submit new articles as drafts.</li>
          <li><b>Admin:</b> Full access to management endpoints.</li>
        </ul>

        <h3 style={h3Style}>Examples</h3>
        <p style={pStyle}><b>Fetch Articles (GET):</b></p>
        <pre style={codeBlockStyle}>{`GET /api/articles\nHeader: X-API-Key: im_your_key_here`}</pre>

        <p style={pStyle}><b>Create Article (POST):</b></p>
        <pre style={codeBlockStyle}>{`POST /api/articles\nHeader: X-API-Key: im_your_key_here\nContent-Type: application/json\n\n{\n  "title": "My API Story",\n  "contentHtml": "<p>Content must be at least 20 chars</p>",\n  "language": "EN",\n  "region": "MAHARASHTRA"\n}`}</pre>

        <h3 style={h3Style}>Common Endpoints</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
          <thead>
            <tr style={{ textAlign: "left", background: "#f8f9fa", borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ padding: 12 }}>Method</th>
              <th style={{ padding: 12 }}>Endpoint</th>
              <th style={{ padding: 12 }}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: 12 }}><code>GET</code></td>
              <td style={{ padding: 12 }}><code>/api/articles</code></td>
              <td style={{ padding: 12 }}>Fetch published articles. Supports query params: <code>limit</code>, <code>status</code>.</td>
            </tr>
            <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: 12 }}><code>POST</code></td>
              <td style={{ padding: 12 }}><code>/api/articles</code></td>
              <td style={{ padding: 12 }}>Create a new article (requires Journalist or Admin role for the key).</td>
            </tr>
          </tbody>
        </table>

        <div style={{ ...htmlGuideCard, marginTop: 20, borderLeft: "4px solid #3b82f6" }}>
          <p style={{ margin: 0, fontSize: 14 }}>
            <b>Security Tip:</b> Keep your API keys confidential. Revoke and regenerate keys immediately if they are compromised in the <b>API Keys</b> section.
          </p>
        </div>
      </section>
      
      <div style={{ marginTop: 40, padding: 20, background: "var(--brand)", borderRadius: 12, color: "white", fontWeight: 600 }}>
        Tips: Use high-quality images (16:9 ratio) for the best look on the homepage. Keep excerpts concise to entice readers.
      </div>
    </div>
  );
}

const sectionStyle = {
  marginBottom: 40
};

const h2Style = {
  fontSize: 24,
  fontWeight: 700,
  marginBottom: 20,
  color: "var(--brand)"
};

const h3Style = {
  fontSize: 18,
  fontWeight: 600,
  marginTop: 20,
  marginBottom: 10
};

const pStyle = {
  fontSize: 16,
  lineHeight: 1.6,
  color: "#374151"
};

const htmlGuideCard = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 20,
  marginBottom: 20
};

const subHeadingStyle = {
  margin: "0 0 8px 0",
  fontSize: 16,
  color: "#111827"
};

const codeDescStyle = {
  fontSize: 14,
  color: "#6b7280",
  margin: "0 0 12px 0"
};

const codeBlockStyle = {
  background: "#1e293b",
  color: "#f8fafc",
  padding: "12px 16px",
  borderRadius: 8,
  fontSize: 13,
  margin: 0,
  overflowX: "auto" as const,
  fontFamily: "monospace"
};
